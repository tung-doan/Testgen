from exam.models import PaperSubmission, PaperAnswerDetected, PaperUserAnswer, PaperTestQuestion, PaperTestVariant
import os
from django.db import transaction
import cv2
import numpy as np
from imutils import contours
import imutils
from imutils.perspective import four_point_transform
import cloudinary
import cloudinary.uploader
import tempfile
import requests
from exam.template_parser import (
    TemplateValidationError,
    get_threshold,
    load_template,
    load_template_for_test,
    get_template_version,
    get_block,
    get_all_answer_blocks,
    get_bubble_positions,
    get_row_y,
    get_timing_mark_positions,
    get_timing_mark_dims,
)


# Debug output directory
DEBUG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', )


def _save_debug(filename, image):
    """Save debug image to the api/ directory."""
    try:
        path = os.path.join(DEBUG_DIR, filename)
        cv2.imwrite(path, image)
        print(f"[DEBUG] Saved: {path}")
    except Exception as e:
        print(f"[DEBUG] Failed to save {filename}: {e}")


def get_paper_transform(image_path):
    """
    2-pass perspective transform pipeline:
    
    Pass 1 (Rough): Find paper contour → perspective transform → flat but imprecise
    Pass 2 (Precise): Find 4 corner markers on flat image → warp again → pixel-perfect
    
    This 2-pass approach works because:
    - Pass 1 handles any camera angle (paper edge is always visible)
    - Pass 2 gives precise alignment (markers are easy to find on a flat image)
    
    Returns: (paper_color, warped_gray, thresh)
    """
    image = cv2.imread(image_path)
    if image is None:
        raise Exception(f"Cannot read image: {image_path}")
    
    # Resize large images for faster processing
    max_dim = 1500
    h_orig, w_orig = image.shape[:2]
    if max(h_orig, w_orig) > max_dim:
        scale = max_dim / max(h_orig, w_orig)
        image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h_img, w_img = gray.shape
    img_area = h_img * w_img
    
    # ==================================================================
    # PASS 1: Find paper contour (rough alignment)
    # ==================================================================
    print("[OMR] === PASS 1: Paper contour detection ===")
    docCnt = None
    detection_method = "none"
    
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    for attempt_name, edged in _get_edge_variants(blurred):
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        closed = cv2.morphologyEx(edged, cv2.MORPH_CLOSE, kernel)
        
        cnts = cv2.findContours(closed.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = imutils.grab_contours(cnts)
        cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:5]
        
        for c in cnts:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4:
                area = cv2.contourArea(approx)
                if area > img_area * 0.15:
                    if _is_valid_paper_contour(approx, h_img, w_img):
                        docCnt = approx
                        detection_method = f"paper_contour({attempt_name})"
                        print(f"[OMR] ✅ Pass 1: Found paper via {attempt_name}, area={area/img_area*100:.1f}%")
                        break
        if docCnt is not None:
            break
    
    _save_debug("debug_edged.jpg", closed if docCnt is not None else edged)
    
    # DEBUG: Save pass 1 result
    debug_paper = image.copy()
    if docCnt is not None:
        cnt_draw = docCnt.reshape(-1, 1, 2) if docCnt.ndim != 3 else docCnt
        cv2.drawContours(debug_paper, [cnt_draw], -1, (0, 255, 0), 3)
        for pt in docCnt.reshape(-1, 2):
            cv2.circle(debug_paper, tuple(pt), 8, (0, 0, 255), -1)
        cv2.putText(debug_paper, f"Pass1: {detection_method}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
    else:
        cv2.putText(debug_paper, "NO PAPER CONTOUR - using full image", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
    _save_debug("debug_detected_paper.jpg", debug_paper)
    
    # Apply Pass 1 transform
    if docCnt is not None:
        pts = docCnt.reshape(4, 2)
        paper_pass1 = four_point_transform(image, pts)
        gray_pass1 = four_point_transform(gray, pts)
        print(f"[OMR] Pass 1 warped: {gray_pass1.shape[1]}x{gray_pass1.shape[0]}")
    else:
        print("[OMR] WARNING: No paper contour. Using full image.")
        paper_pass1 = image.copy()
        gray_pass1 = gray.copy()
    
    _save_debug("debug_pass1_warped.jpg", paper_pass1)
    
    # ==================================================================
    # PASS 2: Find corner markers on the flattened image (precise alignment)
    # ==================================================================
    print("[OMR] === PASS 2: Corner marker refinement ===")
    
    markerCnt = _find_corner_markers(gray_pass1)
    
    if markerCnt is not None:
        detection_method += " + markers"
        pts2 = markerCnt.reshape(4, 2)
        paper = four_point_transform(paper_pass1, pts2)
        warped = four_point_transform(gray_pass1, pts2)
        print(f"[OMR] ✅ Pass 2: Refined with markers → {warped.shape[1]}x{warped.shape[0]}")
        
        # DEBUG: Draw markers on pass1 image
        debug_pass2 = paper_pass1.copy()
        for pt in pts2:
            cv2.circle(debug_pass2, tuple(pt), 8, (0, 0, 255), -1)
        cv2.drawContours(debug_pass2, [markerCnt.reshape(-1, 1, 2)], -1, (255, 0, 255), 2)
        cv2.putText(debug_pass2, "Pass2: corner_markers", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 255), 2)
        _save_debug("debug_pass2_markers.jpg", debug_pass2)
    else:
        print("[OMR] ⚠️  Pass 2: No corner markers found, using Pass 1 result only")
        paper = paper_pass1
        warped = gray_pass1
    
    print(f"[OMR] Final detection: {detection_method}")
    print(f"[OMR] Final warped size (before resize): {warped.shape[1]}x{warped.shape[0]}")
    
    # ==================================================================
    # Resize to fixed target size (constant across all template tiers)
    # ==================================================================
    target_w, target_h = 800, 1000
    try:
        print(f"[OMR] Resizing → {target_w}x{target_h}")
        paper = cv2.resize(paper, (target_w, target_h), interpolation=cv2.INTER_LINEAR)
        warped = cv2.resize(warped, (target_w, target_h), interpolation=cv2.INTER_LINEAR)
    except Exception as e:
        print(f"[OMR] WARNING: Could not resize to target: {e}")

    thresh = cv2.threshold(warped, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]
    
    _save_debug("debug_thresh.jpg", thresh)
    
    return paper, warped, thresh


def _get_edge_variants(blurred):
    """
    Generate multiple edge detection results to try.
    Yields: (name, edge_image) tuples.
    """
    # Variant 1: Canny with moderate thresholds
    for low, high in [(30, 100), (50, 150), (75, 200)]:
        edged = cv2.Canny(blurred, low, high)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        edged = cv2.dilate(edged, kernel, iterations=2)
        yield f"canny({low},{high})", edged
    
    # Variant 2: Adaptive threshold → edge-like result
    thresh_adapt = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2
    )
    yield "adaptive", thresh_adapt
    
    # Variant 3: Simple threshold (good when paper is very white on dark bg)
    _, simple = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY | cv2.THRESH_OTSU)
    yield "otsu", simple


def _is_valid_paper_contour(approx, img_h, img_w):
    """
    Validate that a 4-point contour looks like a paper sheet.
    Checks aspect ratio and that it's a reasonable quadrilateral.
    """
    pts = approx.reshape(4, 2).astype(float)
    
    # Calculate bounding rect
    x, y, w, h = cv2.boundingRect(approx)
    if w == 0 or h == 0:
        return False
    
    # Aspect ratio of bounding rect should be paper-like (0.5 to 2.0)
    ar = w / float(h)
    if ar < 0.3 or ar > 3.0:
        return False
    
    # The contour area should be a reasonable fraction of its bounding rect
    # (i.e., it's roughly rectangular, not a thin triangle)
    contour_area = cv2.contourArea(approx)
    rect_area = w * h
    fill_ratio = contour_area / rect_area if rect_area > 0 else 0
    if fill_ratio < 0.5:  # Less than 50% fill = not rectangular enough
        return False
    
    return True


def _find_corner_markers(gray):
    """
    Try to find 4 black square corner markers in the image.
    Uses adaptive thresholding + multiple threshold levels for robustness.
    
    KEY: For perspective transform, we use the OUTER CORNER of each marker
    (not the center), because the outer corners define the paper boundary.
    - TL marker → use its top-left corner
    - TR marker → use its top-right corner  
    - BL marker → use its bottom-left corner
    - BR marker → use its bottom-right corner
    
    Returns: 4-point contour (numpy array) or None
    """
    h, w = gray.shape

    # Try multiple threshold values — bottom corners may be under shadow
    threshold_levels = [40, 60, 80, 100, 120]

    # Store both center (for scoring) and bounding box (for outer corner)
    marker_data = {}  # name -> (center_x, center_y, bx_global, by_global, bw, bh)

    for thresh_val in threshold_levels:
        _, binary = cv2.threshold(gray, thresh_val, 255, cv2.THRESH_BINARY_INV)

        # Search zone: 30% from each edge
        corner_size_y = int(h * 0.30)
        corner_size_x = int(w * 0.30)

        corners = {
            'TL': (0, 0, corner_size_x, corner_size_y),
            'TR': (w - corner_size_x, 0, w, corner_size_y),
            'BL': (0, h - corner_size_y, corner_size_x, h),
            'BR': (w - corner_size_x, h - corner_size_y, w, h),
        }

        for name, (x1, y1, x2, y2) in corners.items():
            if name in marker_data:
                continue

            region = binary[y1:y2, x1:x2]

            # Morphological closing to fill holes in corner markers
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
            region = cv2.morphologyEx(region, cv2.MORPH_CLOSE, kernel)

            cnts = cv2.findContours(region.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            cnts = imutils.grab_contours(cnts)

            best_marker = None
            best_score = 0

            for c in cnts:
                area = cv2.contourArea(c)
                if area < 50:
                    continue
                (bx, by, bw, bh) = cv2.boundingRect(c)
                ar = bw / float(bh) if bh > 0 else 0
                if 0.5 <= ar <= 2.0:
                    squareness = 1.0 - abs(1.0 - ar)
                    score = area * squareness
                    if score > best_score:
                        best_score = score
                        # Store bounding box in GLOBAL coordinates
                        best_marker = {
                            'bx': x1 + bx,
                            'by': y1 + by, 
                            'bw': bw,
                            'bh': bh,
                        }

            if best_marker:
                marker_data[name] = best_marker

        if len(marker_data) == 4:
            break

    print(f"[OMR] Corner markers found: {list(marker_data.keys())} / 4")
    for name, m in marker_data.items():
        print(f"[OMR]   {name}: bbox=({m['bx']},{m['by']}) size={m['bw']}x{m['bh']}")

    # Build the 4-point contour using CENTER of each marker.
    # Center gives the most stable reference point:
    # - Outer corner extends into the background when markers are near image edges
    # - Center is always on the paper, giving a clean warp
    def _get_marker_point(name, m):
        """Return the center point of a marker."""
        bx, by, bw, bh = m['bx'], m['by'], m['bw'], m['bh']
        return (bx + bw // 2, by + bh // 2)

    # ===== CASE 1: All 4 corners found =====
    if len(marker_data) == 4:
        pts = np.array([
            _get_marker_point('TL', marker_data['TL']),
            _get_marker_point('TR', marker_data['TR']),
            _get_marker_point('BR', marker_data['BR']),
            _get_marker_point('BL', marker_data['BL']),
        ], dtype=np.float32)
        print(f"[OMR] ✅ 4 corners (center): TL={pts[0].tolist()}, TR={pts[1].tolist()}, BR={pts[2].tolist()}, BL={pts[3].tolist()}")
        return pts.reshape(4, 1, 2).astype(np.int32)

    # ===== CASE 2: 3 corners found — estimate the missing one =====
    if len(marker_data) == 3:
        missing = [k for k in ['TL', 'TR', 'BL', 'BR'] if k not in marker_data]
        missing_name = missing[0]
        print(f"[OMR] ⚠️  Only 3 corners found, estimating '{missing_name}'")

        # Get center points for found markers
        found_pts = {}
        for name in marker_data:
            found_pts[name] = _get_marker_point(name, marker_data[name])

        tl = found_pts.get('TL')
        tr = found_pts.get('TR')
        bl = found_pts.get('BL')
        br = found_pts.get('BR')

        if missing_name == 'BR' and tl and tr and bl:
            est = (tr[0] + bl[0] - tl[0], tr[1] + bl[1] - tl[1])
        elif missing_name == 'BL' and tl and tr and br:
            est = (tl[0] + br[0] - tr[0], tl[1] + br[1] - tr[1])
        elif missing_name == 'TR' and tl and bl and br:
            est = (tl[0] + br[0] - bl[0], tl[1] + br[1] - bl[1])
        elif missing_name == 'TL' and tr and bl and br:
            est = (tr[0] + bl[0] - br[0], tr[1] + bl[1] - br[1])
        else:
            return None

        est = (max(0, min(w - 1, est[0])), max(0, min(h - 1, est[1])))
        found_pts[missing_name] = est
        print(f"[OMR] Estimated '{missing_name}' at: {est}")

        pts = np.array([
            found_pts['TL'],
            found_pts['TR'],
            found_pts['BR'],
            found_pts['BL'],
        ], dtype=np.float32)
        return pts.reshape(4, 1, 2).astype(np.int32)

    return None


def _detect_bubble_digits(thresh_region, num_digits, column_width=60, digit_crop_width=50,
                          min_bubble_size=8, aspect_range=(0.5, 2.0), fill_threshold=40,
                          fill_ratio=1.5, debug_name=None):
    """
    Detect N digit values (0-9) from a bubble grid region.
    Layout: N columns (one per digit), 10 rows (digit values 0-9).

    Algorithm:
    1. Auto-detect N column X-bands from histogram
    2. Find where the header input boxes end using contour detection
       (header = wide rectangle spanning ~full width at top)
    3. Divide remaining height into 10 equal rows
    4. For each column, find row with most white pixels = selected digit
    5. Save annotated debug image if debug_name provided

    Returns: list of num_digits strings ('0'-'9') or None
    """
    h, w = thresh_region.shape[:2]
    if h == 0 or w == 0:
        return [None] * num_digits

    # ---- Step 1: Auto-detect column X boundaries from histogram ----
    col_sums = np.sum(thresh_region > 0, axis=0).astype(np.float32)
    ks = max(3, w // (num_digits * 8))
    col_smooth = np.convolve(col_sums, np.ones(ks) / ks, mode='same')
    thresh_val = max(col_smooth.max() * 0.12, 1.0)
    active = col_smooth > thresh_val

    bands, in_b = [], False
    for i, a in enumerate(active):
        if a and not in_b:
            bs = i; in_b = True
        elif not a and in_b:
            bands.append([bs, i - 1]); in_b = False
    if in_b:
        bands.append([bs, len(active) - 1])

    merged = []
    for band in bands:
        if merged and band[0] - merged[-1][1] < 8:
            merged[-1][1] = band[1]
        else:
            merged.append(list(band))
    merged = [b for b in merged if b[1] - b[0] >= 5]

    col_bands = merged[:num_digits] if len(merged) >= num_digits else \
                [[i * (w // num_digits), (i + 1) * (w // num_digits) - 1] for i in range(num_digits)]
    print(f"[OMR]   columns ({num_digits}): {col_bands}")

    # ---- Step 2: Determine header end Y ----
    # The crop region contains: 1 header row (input boxes) + 10 bubble rows (digits 0-9)
    # Total = 11 rows. Each row height = h / 11.
    # header_end_y = 1 * (h/11)  ← end of the header input box row
    #
    # From debug images (210x230 region): h/11 = 230/11 ≈ 20.9px per row
    # Header box row occupies y=0..20, bubble rows start at y=21.
    # This formula is reliable and needs no contour/density detection.
    row_slot_h = h / 11.0          # height of each of the 11 slots
    header_end_y = int(row_slot_h)  # end of slot 0 (the header row)

    print(f"[OMR]   row_slot={row_slot_h:.1f}px, header_end_y={header_end_y}, bubbles={h-header_end_y}px")

    # ---- Step 3: Divide remaining 10 slots into bubble rows ----
    bubble_rows = []
    for i in range(10):
        ry1 = int(header_end_y + i * row_slot_h)
        ry2 = int(header_end_y + (i + 1) * row_slot_h) - 1
        bubble_rows.append((ry1, min(ry2, h - 1)))

    print(f"[OMR]   rows: {[(r[0],r[1]) for r in bubble_rows]}")


    # ---- Step 4: Per column, find the most filled row ----
    # Key insight from debug: empty bubble rings = ~75-100px, filled bubbles = ~200-280px
    # Use RELATIVE comparison: filled = significantly above median of all rows in column
    detected_digits = []
    per_col_fills = []

    for col_idx, (cx1, cx2) in enumerate(col_bands):
        cx1, cx2 = max(0, cx1), min(w - 1, cx2)
        col_region = thresh_region[:, cx1:cx2 + 1]
        col_w = cx2 - cx1 + 1

        row_fills = []
        for ry1, ry2 in bubble_rows:
            cell = col_region[ry1:ry2 + 1, :]
            wp = int(np.sum(cell > 0))
            row_fills.append(wp)

        per_col_fills.append(row_fills)
        fills_str = ', '.join(f'{f:4d}' for f in row_fills)

        # Find filled bubble: must be the MAX and be significantly above the median
        max_fill = max(row_fills) if row_fills else 0
        median_fill = float(np.median(row_fills)) if row_fills else 0

        best_digit = None
        # A filled bubble must be:
        # 1. At least fill_threshold pixels absolute
        # 2. At least fill_ratio × the median (separates solid fill from ring borders)
        # 3. The maximum in the column
        if max_fill >= fill_threshold and median_fill > 0 and max_fill >= median_fill * fill_ratio:
            best_row = int(np.argmax(row_fills))
            best_digit = str(best_row)

        detected_digits.append(best_digit)
        print(f"[OMR]   col{col_idx}(x={cx1}:{cx2}) digit={best_digit} max={max_fill} median={median_fill:.0f} fills=[{fills_str}]")


    # ---- Step 5: Save annotated debug grid image ----
    if debug_name:
        debug_img = cv2.cvtColor(thresh_region, cv2.COLOR_GRAY2BGR)
        # Draw header end line (yellow)
        cv2.line(debug_img, (0, header_end_y), (w, header_end_y), (0, 255, 255), 1)
        # Draw row grid lines (blue)
        for ry1, ry2 in bubble_rows:
            cv2.line(debug_img, (0, ry1), (w, ry1), (255, 100, 0), 1)
        # Draw last row bottom
        if bubble_rows:
            cv2.line(debug_img, (0, bubble_rows[-1][1]), (w, bubble_rows[-1][1]), (255, 100, 0), 1)
        # Draw column lines (green)
        for cx1, cx2 in col_bands:
            cv2.line(debug_img, (cx1, 0), (cx1, h), (0, 200, 0), 1)
            cv2.line(debug_img, (cx2, 0), (cx2, h), (0, 200, 0), 1)
        # Mark detected digit per column (red dot on detected row)
        for col_idx, (digit, (cx1, cx2)) in enumerate(zip(detected_digits, col_bands)):
            if digit is not None:
                row_idx = int(digit)
                ry1, ry2 = bubble_rows[row_idx]
                cy = (ry1 + ry2) // 2
                cx = (cx1 + cx2) // 2
                cv2.circle(debug_img, (cx, cy), 4, (0, 0, 255), -1)
                cv2.putText(debug_img, digit, (cx1, header_end_y - 2),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 255), 1)
        _save_debug(debug_name, debug_img)

    return detected_digits


# ==============================================================================
# v2.0 GRID-BASED SCANNING (with timing mark Y-calibration)
# ==============================================================================

def _calibrate_timing_marks(thresh, template):
    """
    Detect timing marks on the left margin and build Y-correction map.

    For each expected timing mark position, searches a narrow ROI to find
    the actual black mark center. Returns a dict mapping expected_y -> actual_y.

    If a timing mark is not found, it is omitted (fallback to mathematical Y).
    """
    positions = get_timing_mark_positions(template)
    tm_w, tm_h = get_timing_mark_dims(template)
    if not positions:
        return {}

    h, w = thresh.shape
    search_x_margin = 8   # px margin for X search
    search_y_margin = 12  # px search range above/below expected Y

    y_corrections = {}

    for tm in positions:
        ex = tm['x']
        ey = tm['y']

        # Define search ROI
        x1 = max(0, int(ex - search_x_margin))
        x2 = min(w, int(ex + tm_w + search_x_margin))
        y1 = max(0, int(ey - search_y_margin))
        y2 = min(h, int(ey + tm_h + search_y_margin))

        if x2 <= x1 or y2 <= y1:
            continue

        roi = thresh[y1:y2, x1:x2]

        # Vertical projection: sum white pixels per row
        row_sums = np.sum(roi > 0, axis=1).astype(np.float32)

        # The timing mark should be a strong black blob → high sum in thresh_inv
        peak = np.max(row_sums)
        if peak < tm_w * 0.3:
            # Mark not found in this ROI
            continue

        # Find connected run of high-density rows (the mark body)
        threshold = peak * 0.4
        active_rows = np.where(row_sums > threshold)[0]
        if len(active_rows) == 0:
            continue

        # Centroid of active rows = actual Y center
        actual_center_local = np.mean(active_rows)
        actual_y = y1 + actual_center_local

        key = round(ey, 1)
        y_corrections[key] = actual_y

    found = len(y_corrections)
    total = len(positions)
    print(f"[OMR] Timing marks calibrated: {found}/{total}")

    return y_corrections


def _get_calibrated_y(expected_y, y_corrections):
    """Get the calibrated Y, falling back to expected if no timing mark found."""
    key = round(expected_y, 1)
    return y_corrections.get(key, expected_y)


def _sample_bubble_fill(thresh, cx, cy, radius):
    """
    Sample the fill level of a bubble at (cx, cy) with given radius.
    Returns the count of white pixels in a circular mask.
    """
    h, w = thresh.shape
    ix, iy, ir = int(round(cx)), int(round(cy)), int(round(radius))

    # Bounds check
    if ix - ir < 0 or ix + ir >= w or iy - ir < 0 or iy + ir >= h:
        return 0

    # Create circular mask
    mask = np.zeros((2 * ir + 1, 2 * ir + 1), dtype=np.uint8)
    cv2.circle(mask, (ir, ir), ir, 255, -1)

    # Extract ROI and apply mask
    roi = thresh[iy - ir:iy + ir + 1, ix - ir:ix + ir + 1]
    if roi.shape != mask.shape:
        return 0

    masked = cv2.bitwise_and(roi, roi, mask=mask)
    return int(np.sum(masked > 0))


def _detect_digits_v2(thresh, block, y_corrections, bubble_radius, debug_name=None):
    """
    Detect digit values from a v2.0 digit_grid block using grid-based sampling.

    For each column (digit position), samples the fill at each of the 10 row
    positions. The row with significantly higher fill than the median is the
    selected digit.

    Args:
        thresh: Thresholded (binary inverse) warped image
        block: Template block dict with origin, gap_x, gap_y, cols, rows
        y_corrections: Timing mark Y-calibration map
        bubble_radius: Bubble radius in pixels
        debug_name: If set, save annotated debug image

    Returns: list of digit strings or None per column
    """
    origin_x = block['origin']['x']
    origin_y = block['origin']['y']
    cols = block['cols']
    rows = block['rows']  # should be 10
    gap_x = block['gap_x']
    gap_y = block['gap_y']
    fill_ratio = block.get('thresholds', {}).get('fill_ratio', 1.5)

    detected = []

    for col in range(cols):
        cx = origin_x + col * gap_x
        row_fills = []

        for row in range(rows):
            expected_y = origin_y + row * gap_y
            actual_y = _get_calibrated_y(expected_y, y_corrections)
            fill = _sample_bubble_fill(thresh, cx, actual_y, bubble_radius)
            row_fills.append(fill)

        # Find the filled bubble using relative comparison
        max_fill = max(row_fills) if row_fills else 0
        median_fill = float(np.median(row_fills)) if row_fills else 0

        best_digit = None
        if max_fill > 20 and median_fill > 0 and max_fill >= median_fill * fill_ratio:
            best_digit = str(np.argmax(row_fills))

        detected.append(best_digit)

        fills_str = ', '.join(f'{f:4d}' for f in row_fills)
        print(f"[OMR-v2] col{col} digit={best_digit} max={max_fill} "
              f"median={median_fill:.0f} fills=[{fills_str}]")

    # Debug visualization
    if debug_name:
        h, w = thresh.shape
        debug_img = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)
        for col in range(cols):
            cx = origin_x + col * gap_x
            for row in range(rows):
                expected_y = origin_y + row * gap_y
                actual_y = _get_calibrated_y(expected_y, y_corrections)
                color = (0, 200, 0)  # green circle
                cv2.circle(debug_img, (int(cx), int(actual_y)),
                           int(bubble_radius), color, 1)
            # Mark detected digit
            if detected[col] is not None:
                dr = int(detected[col])
                dy = origin_y + dr * gap_y
                dy = _get_calibrated_y(dy, y_corrections)
                cv2.circle(debug_img, (int(cx), int(dy)),
                           int(bubble_radius), (0, 0, 255), 2)
        _save_debug(debug_name, debug_img)

    return detected


def _detect_answers_v2(thresh, template, y_corrections, bubble_radius, num_questions):
    """
    Detect answers from v2.0 answer_grid blocks using grid-based sampling.

    For each question, samples fill at each choice position. Uses relative
    fill comparison to determine selected answer(s).

    Returns: {question_index: [selected_choice_indices]}
    """
    answer_blocks = get_all_answer_blocks(template)
    fill_ratio_default = template.get('global_thresholds', {}).get(
        'relative_fill_ratio', 1.5)

    detected_answers = {}
    # Collect per-block debug data for visualization
    _debug_block_data = []

    for block_name, block in answer_blocks:
        origin_x = block['origin']['x']
        origin_y = block['origin']['y']
        cols = block['cols']  # num_choices
        rows = block['rows']  # num questions in this column
        gap_x = block['gap_x']
        gap_y = block['gap_y']
        block_size = block.get('block_size', rows)
        block_gap_y = block.get('block_gap_y', 0)
        q_start = block.get('question_start', 1) - 1  # convert to 0-based
        min_fill = block.get('thresholds', {}).get('min_fill_pixels', 80)
        fill_ratio = block.get('thresholds', {}).get('fill_ratio', fill_ratio_default)

        block_rows_debug = []  # (q_idx, actual_y, choice_fills, selected)

        for row in range(rows):
            q_idx = q_start + row
            if q_idx >= num_questions:
                break

            # Compute Y with block gap
            num_gaps = row // block_size if block_size > 0 else 0
            expected_y = origin_y + row * gap_y + num_gaps * block_gap_y
            actual_y = _get_calibrated_y(expected_y, y_corrections)

            # Sample fill at each choice position
            choice_fills = []
            for col in range(cols):
                cx = origin_x + col * gap_x
                fill = _sample_bubble_fill(thresh, cx, actual_y, bubble_radius)
                choice_fills.append(fill)

            # Determine selected answers
            max_fill = max(choice_fills) if choice_fills else 0
            median_fill = float(np.median(choice_fills)) if choice_fills else 0

            selected = []
            for ci, fill in enumerate(choice_fills):
                if fill >= min_fill and median_fill > 0 and fill >= median_fill * fill_ratio:
                    selected.append(ci)

            detected_answers[q_idx] = selected
            block_rows_debug.append((q_idx, actual_y, choice_fills, selected))

            if len(selected) == 0:
                print(f"[OMR-v2] Q{q_idx+1}: BLANK fills={choice_fills}")
            elif len(selected) > 1:
                print(f"[OMR-v2] Q{q_idx+1}: MULTIPLE={selected} fills={choice_fills}")
            else:
                label = chr(65 + selected[0])
                print(f"[OMR-v2] Q{q_idx+1}: {label} fills={choice_fills}")

        _debug_block_data.append((block_name, block, block_rows_debug))

    # ===== DEBUG: Answer detection overlay =====
    _save_answers_debug(thresh, _debug_block_data, bubble_radius)

    return detected_answers


def _save_answers_debug(thresh, block_data, bubble_radius):
    """
    Generate debug images for answer detection:
    - debug_answers_overlay.jpg: Full-page overlay with all answer bubbles
    - debug_answers_col_N.jpg: Per-column crops with fill annotations
    """
    h, w = thresh.shape
    r = int(bubble_radius)

    # --- 1. Full-page overlay ---
    overlay = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)

    for block_name, block, rows_debug in block_data:
        origin_x = block['origin']['x']
        gap_x = block['gap_x']
        cols = block['cols']

        for q_idx, actual_y, choice_fills, selected in rows_debug:
            for col in range(cols):
                cx = int(origin_x + col * gap_x)
                cy = int(actual_y)

                if col in selected:
                    # Detected answer → filled red circle
                    cv2.circle(overlay, (cx, cy), r, (0, 0, 255), 2)
                    cv2.circle(overlay, (cx, cy), r - 2, (0, 0, 255), cv2.FILLED)
                else:
                    # Empty bubble → thin green circle
                    cv2.circle(overlay, (cx, cy), r, (0, 180, 0), 1)

            # Question label
            first_cx = int(origin_x)
            cv2.putText(overlay, f"Q{q_idx+1}", (first_cx - 35, int(actual_y) + 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 200, 0), 1)

    _save_debug("debug_answers_overlay.jpg", overlay)

    # --- 2. Per-column crops with fill annotations ---
    for col_idx, (block_name, block, rows_debug) in enumerate(block_data):
        if not rows_debug:
            continue

        origin_x = block['origin']['x']
        gap_x = block['gap_x']
        cols = block['cols']

        # Compute crop region
        x1 = max(0, int(origin_x - gap_x - 40))
        x2 = min(w, int(origin_x + cols * gap_x + gap_x))
        y1 = max(0, int(rows_debug[0][1] - bubble_radius - 15))
        y2 = min(h, int(rows_debug[-1][1] + bubble_radius + 15))

        crop = cv2.cvtColor(thresh[y1:y2, x1:x2], cv2.COLOR_GRAY2BGR)

        for q_idx, actual_y, choice_fills, selected in rows_debug:
            for col in range(cols):
                cx = int(origin_x + col * gap_x) - x1
                cy = int(actual_y) - y1
                fill_val = choice_fills[col]

                if col in selected:
                    cv2.circle(crop, (cx, cy), r, (0, 0, 255), 2)
                    label = chr(65 + col)
                    cv2.putText(crop, label, (cx - 4, cy - r - 3),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.3, (0, 0, 255), 1)
                else:
                    cv2.circle(crop, (cx, cy), r, (0, 180, 0), 1)

                # Fill value annotation
                cv2.putText(crop, str(fill_val), (cx - 8, cy + r + 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.25, (200, 150, 0), 1)

            # Question number
            cv2.putText(crop, f"Q{q_idx+1}", (2, int(actual_y) - y1 + 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 200, 0), 1)

        _save_debug(f"debug_answers_col_{col_idx+1}.jpg", crop)





def detect_all_from_image(image_path, test):
    """
    Combined detection: detect MSSV, variant code, and answers from a single image.
    Uses v2.0 grid-based scanning with timing mark Y-calibration.

    Pipeline:
    1. Perspective transform (2-pass: paper contour → corner markers)
    2. Auto-rotation: try upright, if Student ID all '?' then rotate 180° and retry
    3. Calibrate timing marks for Y-axis correction
    4. Grid-based digit detection for STUDENT ID and TEST ID
    5. Grid-based answer detection for all question blocks

    Returns: (mssv, variant_code, detected_answers, paper, template, y_corrections, bubble_radius)
    """
    paper, warped, thresh = get_paper_transform(image_path)

    h, w = thresh.shape
    print(f"[OMR] Warped image size: {w}x{h}")

    try:
        template = load_template_for_test(test.num_questions)
    except TemplateValidationError as exc:
        raise Exception(f"OMR template is invalid: {exc}") from exc

    bubble_radius = template.get('bubble_radius_px', 9.0)
    num_questions = test.num_questions

    # ===== STEP 1: TIMING MARK Y-CALIBRATION =====
    print("[OMR-v2] === Timing mark calibration ===")
    y_corrections = _calibrate_timing_marks(thresh, template)

    # ===== DEBUG: Draw grid overlay =====
    debug_overlay = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)
    for tm in get_timing_mark_positions(template):
        ex, ey = int(tm['x']), int(tm['y'])
        key = round(tm['y'], 1)
        if key in y_corrections:
            ay = int(y_corrections[key])
            cv2.rectangle(debug_overlay, (ex - 2, ay - 2), (ex + 8, ay + 2), (0, 255, 0), 1)
        else:
            cv2.rectangle(debug_overlay, (ex - 2, ey - 2), (ex + 8, ey + 2), (0, 0, 255), 1)
    _save_debug("debug_timing_marks.jpg", debug_overlay)

    # ===== STEP 2: DETECT STUDENT ID (with auto-rotation) =====
    print("[OMR-v2] === Detecting STUDENT ID ===")
    sid_block = get_block(template, 'student_id')
    mssv_digits = _detect_digits_v2(
        thresh, sid_block, y_corrections, bubble_radius,
        debug_name="debug_grid_mssv_v2.jpg"
    )

    # --- AUTO-ROTATION 180° ---
    # If all digits are None/'?', the sheet might be upside down.
    valid_digit_count = sum(1 for d in mssv_digits if d is not None)
    if valid_digit_count == 0:
        print("[OMR-v2] ⚠️  Student ID all blank — trying 180° rotation")
        paper_r = cv2.rotate(paper, cv2.ROTATE_180)
        warped_r = cv2.rotate(warped, cv2.ROTATE_180)
        thresh_r = cv2.rotate(thresh, cv2.ROTATE_180)

        y_corrections_r = _calibrate_timing_marks(thresh_r, template)
        mssv_digits_r = _detect_digits_v2(
            thresh_r, sid_block, y_corrections_r, bubble_radius,
            debug_name="debug_grid_mssv_v2_rotated.jpg"
        )
        valid_r = sum(1 for d in mssv_digits_r if d is not None)

        if valid_r > valid_digit_count:
            print(f"[OMR-v2] ✅ 180° rotation improved: {valid_digit_count}→{valid_r} valid digits. Using rotated image.")
            paper, warped, thresh = paper_r, warped_r, thresh_r
            y_corrections = y_corrections_r
            mssv_digits = mssv_digits_r
        else:
            print("[OMR-v2] 180° rotation did not help. Keeping original orientation.")

    mssv = ''.join(d if d is not None else '?' for d in mssv_digits)
    print(f"[OMR-v2] Detected MSSV: {mssv}")

    # ===== STEP 3: DETECT TEST ID (3 digits) =====
    print("[OMR-v2] === Detecting TEST ID ===")
    tid_block = get_block(template, 'test_id')
    variant_digits = _detect_digits_v2(
        thresh, tid_block, y_corrections, bubble_radius,
        debug_name="debug_grid_variant_v2.jpg"
    )
    for i, d in enumerate(variant_digits):
        if d is None:
            raise Exception(
                f"Cannot read digit {i + 1} of the Test ID. "
                f"Please check if the bubbles are filled correctly."
            )
    variant_code = ''.join(variant_digits)
    print(f"[OMR-v2] Detected variant code: {variant_code}")

    # ===== DEBUG: Draw detected digits on paper =====
    debug_regions = paper.copy()
    _draw_block_debug(debug_regions, sid_block, y_corrections,
                      bubble_radius, mssv_digits, (255, 100, 0), "MSSV")
    _draw_block_debug(debug_regions, tid_block, y_corrections,
                      bubble_radius, variant_digits, (0, 0, 255), "TEST_ID")
    _save_debug("debug_header_regions_v2.jpg", debug_regions)

    # ===== STEP 4: DETECT ANSWERS =====
    print("[OMR-v2] === Detecting answers ===")
    detected_answers = _detect_answers_v2(
        thresh, template, y_corrections, bubble_radius, num_questions
    )

    return mssv, variant_code, detected_answers, paper, template, y_corrections, bubble_radius


def _draw_block_debug(image, block, y_corrections, bubble_radius,
                      detected_values, color, label):
    """Draw debug visualization of a digit block on paper image."""
    origin_x = block['origin']['x']
    origin_y = block['origin']['y']
    cols = block['cols']
    rows = block['rows']
    gap_x = block['gap_x']
    gap_y = block['gap_y']

    for col in range(cols):
        cx = int(origin_x + col * gap_x)
        for row in range(rows):
            ey = origin_y + row * gap_y
            ay = int(_get_calibrated_y(ey, y_corrections))
            cv2.circle(image, (cx, ay), int(bubble_radius), color, 1)

        # Highlight detected digit
        if col < len(detected_values) and detected_values[col] is not None:
            dr = int(detected_values[col])
            ey = origin_y + dr * gap_y
            ay = int(_get_calibrated_y(ey, y_corrections))
            cv2.circle(image, (cx, ay), int(bubble_radius) + 2, (0, 255, 0), 2)

    # Label
    lx = int(origin_x)
    ly = int(origin_y - 15)
    result = ''.join(d if d else '?' for d in detected_values)
    cv2.putText(image, f"{label}: {result}", (lx, ly),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

def _save_grading_comparison(detected_answers, answer_key, num_questions,
                             correct_count, total_questions, variant_code, mssv):
    """
    Generate a visual grading comparison table image.
    Shows: Question | Detected | Correct | Result for each question.
    Saved as debug_grading_comparison.jpg
    """
    row_h = 22
    col_widths = [60, 100, 100, 80]  # Q#, Detected, Correct, Result
    table_w = sum(col_widths)
    header_h = 60  # space for title + summary
    table_h = header_h + row_h * (num_questions + 1)  # +1 for header row

    img = np.ones((table_h, table_w, 3), dtype=np.uint8) * 255

    # Title
    cv2.putText(img, f"MSSV: {mssv}  Variant: {variant_code}", (10, 18),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)
    score_10 = round((correct_count / total_questions) * 10, 1) if total_questions > 0 else 0
    cv2.putText(img, f"Score: {correct_count}/{total_questions} ({score_10}/10)", (10, 38),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 150), 1)

    # Header row
    y = header_h
    headers = ["Q#", "Detected", "Correct", "Result"]
    x = 0
    for i, hdr in enumerate(headers):
        cv2.rectangle(img, (x, y), (x + col_widths[i], y + row_h), (200, 200, 200), cv2.FILLED)
        cv2.putText(img, hdr, (x + 5, y + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 0, 0), 1)
        x += col_widths[i]
    cv2.line(img, (0, y + row_h), (table_w, y + row_h), (100, 100, 100), 1)

    # Data rows
    for q_idx in range(num_questions):
        y = header_h + row_h * (q_idx + 1)
        user_indices = detected_answers.get(q_idx, [])
        correct_indices = answer_key.get(q_idx, [])

        user_str = ', '.join(chr(65 + i) for i in sorted(user_indices)) if user_indices else "—"
        correct_str = ', '.join(chr(65 + i) for i in sorted(correct_indices)) if correct_indices else "—"
        is_correct = (set(user_indices) == set(correct_indices)) and len(user_indices) > 0

        result_str = "OK" if is_correct else "WRONG"
        result_color = (0, 140, 0) if is_correct else (0, 0, 200)

        # Alternate row background
        if q_idx % 2 == 0:
            cv2.rectangle(img, (0, y), (table_w, y + row_h), (245, 245, 245), cv2.FILLED)

        x = 0
        texts = [f" {q_idx + 1}", f" {user_str}", f" {correct_str}", f" {result_str}"]
        colors = [(0, 0, 0), (0, 0, 0), (0, 0, 0), result_color]
        for i, (txt, clr) in enumerate(zip(texts, colors)):
            cv2.putText(img, txt, (x + 3, y + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.35, clr, 1)
            x += col_widths[i]

        # Row separator
        cv2.line(img, (0, y + row_h), (table_w, y + row_h), (220, 220, 220), 1)

    # Column separators
    x = 0
    for cw in col_widths:
        x += cw
        cv2.line(img, (x, header_h), (x, table_h), (180, 180, 180), 1)

    _save_debug("debug_grading_comparison.jpg", img)


# ==============================================================================
# GRADED IMAGE OVERLAY
# ==============================================================================

def draw_graded_overlay(paper, template, y_corrections, bubble_radius,
                        detected_answers, answer_key, num_questions,
                        correct_count, total_questions):
    """
    Draw transparent green/red overlay on the warped color image.

    Color code:
    - Green transparent fill: student selected correctly
    - Red transparent fill: student selected incorrectly
    - Green hollow ring: correct answer the student missed

    Uses cv2.addWeighted for 30% opacity blending so pencil marks
    remain visible underneath.

    Returns: annotated BGR image
    """
    result = paper.copy()
    answer_blocks = get_all_answer_blocks(template)

    GREEN = (0, 200, 0)
    RED = (0, 0, 200)
    ALPHA = 0.3  # 30% overlay opacity

    for block_name, block in answer_blocks:
        origin_x = block['origin']['x']
        origin_y = block['origin']['y']
        cols = block['cols']
        rows = block['rows']
        gap_x = block['gap_x']
        gap_y = block['gap_y']
        block_size = block.get('block_size', rows)
        block_gap_y = block.get('block_gap_y', 0)
        q_start = block.get('question_start', 1) - 1

        for row in range(rows):
            q_idx = q_start + row
            if q_idx >= num_questions:
                break

            user_selected = set(detected_answers.get(q_idx, []))
            correct_set = set(answer_key.get(q_idx, []))

            num_gaps = row // block_size if block_size > 0 else 0
            expected_y = origin_y + row * gap_y + num_gaps * block_gap_y
            actual_y = _get_calibrated_y(expected_y, y_corrections)

            r = int(bubble_radius)

            for col in range(cols):
                cx = int(origin_x + col * gap_x)
                cy = int(actual_y)

                is_selected = col in user_selected
                is_correct_choice = col in correct_set

                if is_selected and is_correct_choice:
                    # Student picked this AND it's correct → GREEN FILL (transparent)
                    overlay = result.copy()
                    cv2.circle(overlay, (cx, cy), r, GREEN, cv2.FILLED)
                    cv2.addWeighted(overlay, ALPHA, result, 1 - ALPHA, 0, result)
                    cv2.circle(result, (cx, cy), r, GREEN, 2)

                elif is_selected and not is_correct_choice:
                    # Student picked this BUT it's wrong → RED FILL (transparent)
                    overlay = result.copy()
                    cv2.circle(overlay, (cx, cy), r, RED, cv2.FILLED)
                    cv2.addWeighted(overlay, ALPHA, result, 1 - ALPHA, 0, result)
                    cv2.circle(result, (cx, cy), r, RED, 2)

                elif not is_selected and is_correct_choice:
                    # Correct answer the student missed → GREEN HOLLOW RING
                    cv2.circle(result, (cx, cy), r + 2, GREEN, 2)

    # Draw score text at top-right
    score_text = f"Score: {correct_count}/{total_questions}"
    scale_10 = round((correct_count / total_questions) * 10, 1) if total_questions > 0 else 0
    full_text = f"{score_text} ({scale_10}/10)"

    # White background bar for readability
    (tw, th), _ = cv2.getTextSize(full_text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
    tx = result.shape[1] - tw - 15
    ty = 30
    cv2.rectangle(result, (tx - 8, ty - th - 8), (tx + tw + 8, ty + 8), (255, 255, 255), cv2.FILLED)
    cv2.rectangle(result, (tx - 8, ty - th - 8), (tx + tw + 8, ty + 8), (0, 0, 0), 1)
    color = GREEN if scale_10 >= 5.0 else RED
    cv2.putText(result, full_text, (tx, ty),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

    return result


# ==============================================================================
# SUBMISSION PROCESSING PIPELINE
# ==============================================================================

def process_submission_cloudinary(submission_id, image_url):
    """
    Process submission with variant detection + MSSV detection + grading.

    Flow:
    1. Download image from Cloudinary
    2. Detect MSSV (8 digits), variant code (3 digits), answers in one pass
    3. Get variant from DB
    4. Get answer key for that variant
    5. Grade and save (including MSSV)
    6. Draw graded overlay and re-upload to Cloudinary (overwrites submission_image)
    """
    try:
        submission = PaperSubmission.objects.get(id=submission_id)
        test = submission.test

        print(f"[OMR] Processing submission {submission_id} for test '{test.title}'")

        # Download image from Cloudinary
        response = requests.get(image_url)
        response.raise_for_status()

        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            tmp_file.write(response.content)
            tmp_image_path = tmp_file.name

        print(f"[OMR] Downloaded image to: {tmp_image_path}")

        # ===== DEBUG: Save original input image =====
        original_input = cv2.imread(tmp_image_path)
        if original_input is not None:
            _save_debug("debug_original_input.jpg", original_input)

        # ===== STEP 1: DETECT ALL (MSSV + Variant + Answers) =====
        mssv, variant_code, detected_answers, paper, template, y_corrections, bubble_radius = \
            detect_all_from_image(tmp_image_path, test)
        print(f"[OMR] Detected MSSV: {mssv}, Variant: {variant_code}")
        print(f"[OMR] Detected answers: {detected_answers}")

        # ===== STEP 2: SAVE MSSV =====
        submission.detected_mssv = mssv

        # ===== STEP 3: GET VARIANT FROM DB =====
        try:
            variant = PaperTestVariant.objects.get(test=test, variant_code=variant_code)
            submission.variant = variant
            submission.save()
            print(f"[OMR] Found variant in database: {variant.id}")
        except PaperTestVariant.DoesNotExist:
            available = list(test.variants.values_list('variant_code', flat=True))
            raise Exception(
                f"Test ID '{variant_code}' not found. "
                f"Available IDs: {available}. "
                f"Please check the image or filled bubbles."
            )

        # ===== STEP 4: GET ANSWER KEY FOR THIS VARIANT =====
        answer_key = variant.get_answer_key()
        print(f"[OMR] Answer key for variant {variant_code}: {answer_key}")

        # ===== STEP 5: GRADE =====
        correct_count = 0
        total_questions = test.num_questions

        paper_questions = {pq.question.id: pq for pq in test.paper_questions.all()}

        with transaction.atomic():
            # Delete old answers if reprocessing
            PaperAnswerDetected.objects.filter(submission=submission).delete()
            PaperUserAnswer.objects.filter(submission=submission).delete()

            for question_index, user_answer_indices in detected_answers.items():
                if question_index >= len(variant.question_order):
                    continue

                # Map question_index to actual question_id in this variant
                question_id = variant.question_order[question_index]
                paper_question = paper_questions.get(question_id)

                if not paper_question:
                    continue

                # Get correct answer for this question in this variant
                correct_indices_set = set(answer_key.get(question_index, []))
                user_indices_set = set(user_answer_indices)

                # ALL-OR-NOTHING grading
                is_correct = (correct_indices_set == user_indices_set) and len(user_indices_set) > 0

                if is_correct:
                    correct_count += 1

                print(f"[OMR] Q{question_index+1}: User={user_indices_set}, Correct={correct_indices_set}, Result={'CORRECT' if is_correct else 'WRONG'}")

                # Save detected answer
                PaperAnswerDetected.objects.create(
                    submission=submission,
                    question=paper_question,
                    is_correct=is_correct,
                    score=1.0 if is_correct else 0.0
                )

                # Save user answer (JSONField)
                PaperUserAnswer.objects.create(
                    submission=submission,
                    question=paper_question,
                    selected_options=list(user_indices_set)
                )

            # FINAL SCORE
            final_score = (correct_count / total_questions) * 10 if total_questions > 0 else 0
            submission.total_score = round(final_score, 2)
            submission.save()

        print(f"[OMR] Graded: {final_score}/10 ({correct_count}/{total_questions} correct) - Variant {variant_code} - MSSV {mssv}")

        # ===== DEBUG: Grading comparison table =====
        _save_grading_comparison(
            detected_answers, answer_key, test.num_questions,
            correct_count, total_questions, variant_code, mssv
        )

        # ===== STEP 6: DRAW GRADED OVERLAY & RE-UPLOAD =====
        print("[OMR] === Drawing graded overlay ===")
        graded_image = draw_graded_overlay(
            paper, template, y_corrections, bubble_radius,
            detected_answers, answer_key, test.num_questions,
            correct_count, total_questions
        )

        # Save graded image to temp file
        graded_tmp_path = tmp_image_path.replace('.jpg', '_graded.jpg')
        cv2.imwrite(graded_tmp_path, graded_image)
        _save_debug("debug_graded_result.jpg", graded_image)

        # Re-upload graded image to Cloudinary
        try:
            upload_result = cloudinary.uploader.upload(
                graded_tmp_path,
                folder='testgen/graded',
                resource_type='image',
            )
            submission.submission_image = upload_result['secure_url']
            submission.save()
            print(f"[OMR] Graded image uploaded: {upload_result['secure_url']}")
        except Exception as upload_err:
            print(f"[OMR] WARNING: Failed to upload graded image: {upload_err}")

        # Clean up temp files
        for f in [tmp_image_path, graded_tmp_path]:
            try:
                os.unlink(f)
            except:
                pass

        return submission

    except Exception as e:
        print(f"Error processing submission {submission_id}: {str(e)}")
        import traceback
        traceback.print_exc()

        # Clean up temp file if it exists
        try:
            if 'tmp_image_path' in locals():
                os.unlink(tmp_image_path)
            graded_path = locals().get('graded_tmp_path')
            if graded_path:
                os.unlink(graded_path)
        except:
            pass

        # Re-raise — the view will handle cleanup (delete submission)
        raise