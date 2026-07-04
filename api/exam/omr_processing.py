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
import math
import base64
import time
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

# Set OMR_DEBUG=1 to enable debug image saves and verbose logs
OMR_DEBUG = os.environ.get('OMR_DEBUG', '0') == '1'


def _save_debug(filename, image):
    """Save debug image to the api/ directory. Only runs when OMR_DEBUG=1."""
    if not OMR_DEBUG:
        return
    try:
        path = os.path.join(DEBUG_DIR, filename)
        cv2.imwrite(path, image)
        print(f"[DEBUG] Saved: {path}")
    except Exception as e:
        print(f"[DEBUG] Failed to save {filename}: {e}")


def     get_paper_transform(image_path):
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
        raise Exception("Cannot determine, please capture again.")
    
 # Resize large images for faster processing
    max_dim = 1500
    h_orig, w_orig = image.shape[:2]
    if max(h_orig, w_orig) > max_dim:
        scale = max_dim / max(h_orig, w_orig)
        image = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h_img, w_img = gray.shape
    img_area = h_img * w_img
    
 # PASS 1: Find paper contour (rough alignment)
    print("[OMR] === PASS 1: Paper contour detection ===")
    docCnt = None
    detection_method = "none"
    
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    for attempt_name, edged in _get_edge_variants(blurred):
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
        closed = cv2.morphologyEx(edged, cv2.MORPH_CLOSE, kernel)
        
 # Use RETR_LIST to find all contours (not just the outermost ones which might be the image border)
        cnts = cv2.findContours(closed.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        cnts = imutils.grab_contours(cnts)
        cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:10]
        
        for c in cnts:
            peri = cv2.arcLength(c, True)
            
 # Try multiple epsilons to handle slightly curved edges from perspective/lens distortion
            found_approx = None
            for eps_mult in [0.01, 0.02, 0.03, 0.04, 0.05, 0.06]:
                approx = cv2.approxPolyDP(c, eps_mult * peri, True)
                if len(approx) == 4:
                    found_approx = approx
                    break
            
            if found_approx is not None:
                area = cv2.contourArea(found_approx)
 # Reject if contour is too small, OR if it's too large (e.g. >98% area means it's the image border itself)
                if img_area * 0.15 < area < img_area * 0.98:
 # Also check if bounding box touches the very edge of the image
                    bx, by, bw, bh = cv2.boundingRect(found_approx)
                    if bw >= w_img - 10 and bh >= h_img - 10:
                        continue # Skip image boundary
                        
                    if _is_valid_paper_contour(found_approx, h_img, w_img):
                        docCnt = found_approx
                        detection_method = f"paper_contour({attempt_name})"
                        print(f"[OMR]  Pass 1: Found paper via {attempt_name}, area={area/img_area*100:.1f}%")
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
    
 # PASS 2: Find corner markers on the flattened image (precise alignment)
    print("[OMR] === PASS 2: Corner marker refinement ===")
    
    markerCnt = _find_corner_markers(gray_pass1)
    
 # CRITICAL FALLBACK:
 # If Pass 1 incorrectly detected an inner printed box instead of the physical paper edge,
 # the corner markers might have been cropped out! 
 # If Pass 2 fails on the Pass 1 result, we retry Pass 2 on the original full image.
    if markerCnt is None and docCnt is not None:
        print("[OMR] ️ Pass 2 failed on Pass 1 crop. Pass 1 might have cropped too much. Retrying Pass 2 on FULL image...")
        markerCnt_full = _find_corner_markers(gray)
        if markerCnt_full is not None:
            print("[OMR]  Pass 2 succeeded on full image! Discarding bad Pass 1 contour.")
            detection_method = "full_image (Pass 1 discarded)"
            paper_pass1 = image.copy()
            gray_pass1 = gray.copy()
            markerCnt = markerCnt_full
            _save_debug("debug_pass1_warped.jpg", paper_pass1)
    
 # Target warp size — must match template coordinates exactly
    target_w, target_h = 800, 1000
    
    if markerCnt is not None:
        detection_method += " + markers"
        pts2 = markerCnt.reshape(4, 2).astype(np.float32)
        
 # CRITICAL FIX: Map marker centers DIRECTLY to 800x1000 target.
 # four_point_transform creates arbitrary output dimensions based on
 # pixel distances, then resize introduces non-uniform scaling that
 # misaligns bubble coordinates. Direct mapping ensures perfect sync
 # with the template coordinate system.
 # Ordering: TL, TR, BR, BL (same as _find_corner_markers output)
        dst_pts = np.array([
            [0, 0],              # TL marker center → pixel (0,0)
            [target_w, 0],       # TR marker center → pixel (800,0)
            [target_w, target_h], # BR marker center → pixel (800,1000)
            [0, target_h],       # BL marker center → pixel (0,1000)
        ], dtype=np.float32)
        
        M = cv2.getPerspectiveTransform(pts2, dst_pts)
        paper = cv2.warpPerspective(paper_pass1, M, (target_w, target_h))
        warped = cv2.warpPerspective(gray_pass1, M, (target_w, target_h))
        _save_debug("debug_pass2_warped_color.jpg", paper)
        print(f"[OMR]  Pass 2: Direct warp to {target_w}x{target_h} with marker alignment")
        
 # DEBUG: Draw markers on pass1 image
        debug_pass2 = paper_pass1.copy()
        for pt in pts2.astype(int):
            cv2.circle(debug_pass2, tuple(pt), 8, (0, 0, 255), -1)
        cv2.drawContours(debug_pass2, [markerCnt.reshape(-1, 1, 2).astype(np.int32)], -1, (255, 0, 255), 2)
        cv2.putText(debug_pass2, "Pass2: corner_markers", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 255), 2)
        _save_debug("debug_pass2_markers.jpg", debug_pass2)
    else:
        print("[OMR]  Pass 2: No corner markers found. Aborting.")
        raise Exception("Cannot determine, please capture again.")
    
    print(f"[OMR] Final detection: {detection_method}")
    print(f"[OMR] Final warped size: {warped.shape[1]}x{warped.shape[0]}")

 # Adaptive Gaussian threshold for shadow-resistant binarization.
 # Unlike OTSU (global threshold), adaptive computes a local threshold
 # per-pixel neighborhood, so shadows don't create large black regions.
 # Block size 51 covers ~6% of width (800px), large enough to span a
 # bubble + surrounding paper. Constant 10 controls sensitivity.
    thresh = cv2.adaptiveThreshold(warped, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY_INV, 51, 10)
 # Also save CLAHE-enhanced for debug
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    warped_enhanced = clahe.apply(warped)
    
    _save_debug("debug_thresh.jpg", thresh)
    _save_debug("debug_clahe.jpg", warped_enhanced)
    
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
    
 # Aspect ratio of bounding rect should be paper-like (0.3 to 3.0)
    ar = w / float(h)
    if ar < 0.3 or ar > 3.0:
        return False
    
 # Calculate physical edge lengths of the 4-point contour
    def dist(p1, p2): return np.linalg.norm(p1 - p2)
    l1 = dist(pts[0], pts[1])
    l2 = dist(pts[1], pts[2])
    l3 = dist(pts[2], pts[3])
    l4 = dist(pts[3], pts[0])
    
 # Estimate width and height
    w_est = (l1 + l3) / 2
    h_est = (l2 + l4) / 2
    if w_est == 0 or h_est == 0: return False
    
    ar_est = w_est / h_est
 # A4 ratio is ~0.707 (portrait) or ~1.414 (landscape). Allow a reasonable range (0.5 to 0.9 or 1.1 to 1.9)
    if not (0.5 < ar_est < 0.92 or 1.05 < ar_est < 1.95):
        return False
        
 # The contour area should be a reasonable fraction of its bounding rect
 # (i.e., it's roughly rectangular, not a thin triangle)
 # Lowered from 0.5 to 0.35 to allow for papers photographed at an angle (perspective + rotation)
    contour_area = cv2.contourArea(approx)
    rect_area = w * h
    fill_ratio = contour_area / rect_area if rect_area > 0 else 0
    if fill_ratio < 0.35:  # Less than 35% fill = not rectangular enough
        return False
    
    return True


def _validate_marker_geometry(marker_data, get_point_fn, img_w, img_h):
    """
    Validate that 4 detected markers form a reasonable paper rectangle.
    
    Checks:
    1. Marker sizes are consistent (all real markers are printed at the same size)
    2. The quadrilateral has proper paper aspect ratio (~0.7-0.85 for A4)
    3. Opposite edges are roughly parallel
    
    If an outlier is found, remove it so 3-point estimation handles it instead.
    Returns: marker_data dict (possibly with 1 marker removed)
    """
    names = ['TL', 'TR', 'BL', 'BR']
    if not all(n in marker_data for n in names):
        return marker_data
    
 # --- Check 1: Marker size consistency ---
 # All 4 markers on the paper are printed at the same size.
 # A false positive (desk object) will usually be a very different size.
    areas = {}
    for name in names:
        m = marker_data[name]
        areas[name] = m['bw'] * m['bh']
    
    avg_area = np.mean(list(areas.values()))
    size_outlier = None
    max_size_ratio = 0
    
    for name, area in areas.items():
        ratio = max(area / avg_area, avg_area / area) if avg_area > 0 else 999
        if ratio > max_size_ratio:
            max_size_ratio = ratio
            if ratio > 2.5:  # More than 2.5x difference from average
                size_outlier = name
    
    if size_outlier:
        print(f"[OMR] ️  Marker size outlier: {size_outlier} "
              f"(area={areas[size_outlier]}, avg={avg_area:.0f}, ratio={max_size_ratio:.1f}x)")
        del marker_data[size_outlier]
        return marker_data
    
 # --- Check 2: Quadrilateral geometry ---
    tl = np.array(get_point_fn('TL', marker_data['TL']))
    tr = np.array(get_point_fn('TR', marker_data['TR']))
    bl = np.array(get_point_fn('BL', marker_data['BL']))
    br = np.array(get_point_fn('BR', marker_data['BR']))
    
 # Top edge and bottom edge lengths
    top_len = np.linalg.norm(tr - tl)
    bottom_len = np.linalg.norm(br - bl)
    left_len = np.linalg.norm(bl - tl)
    right_len = np.linalg.norm(br - tr)
    
    if top_len < 1 or bottom_len < 1 or left_len < 1 or right_len < 1:
        return marker_data
    
 # Paper aspect ratio: width/height should be ~0.7-0.85 for A4 portrait
 # Allow wider range (0.55 to 1.0) to account for perspective distortion
    avg_width = (top_len + bottom_len) / 2
    avg_height = (left_len + right_len) / 2
    aspect = avg_width / avg_height if avg_height > 0 else 0
    
    if not (0.50 <= aspect <= 1.1):
        print(f"[OMR] ️  Bad aspect ratio: {aspect:.3f} (expected 0.50-1.10)")
 # Find which marker is causing the distortion by checking which removal
 # gives the best estimated rectangle from the remaining 3
        worst_name = _find_geometry_outlier(marker_data, get_point_fn)
        if worst_name:
            print(f"[OMR] Removing geometric outlier: {worst_name}")
            del marker_data[worst_name]
            return marker_data
    
 # --- Check 3: Edge parallelism ---
 # Top and bottom edges should be roughly parallel (angle < 15°)
 # Same for left and right edges
    top_vec = tr - tl
    bottom_vec = br - bl
    left_vec = bl - tl
    right_vec = br - tr
    
    def _angle_between(v1, v2):
        """Angle in degrees between two vectors."""
        cos_a = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6)
        cos_a = np.clip(cos_a, -1, 1)
        return np.degrees(np.arccos(cos_a))
    
    h_angle = _angle_between(top_vec, bottom_vec)
    v_angle = _angle_between(left_vec, right_vec)
    
    if h_angle > 20 or v_angle > 20:
        print(f"[OMR] ️  Edges not parallel: h_angle={h_angle:.1f}°, v_angle={v_angle:.1f}°")
        worst_name = _find_geometry_outlier(marker_data, get_point_fn)
        if worst_name:
            print(f"[OMR] Removing geometric outlier: {worst_name}")
            del marker_data[worst_name]
            return marker_data
    
 # --- Check 4: Edge length ratios ---
 # Opposite edges should have similar lengths (ratio < 1.5)
    h_ratio = max(top_len, bottom_len) / min(top_len, bottom_len)
    v_ratio = max(left_len, right_len) / min(left_len, right_len)
    
    if h_ratio > 1.5 or v_ratio > 1.5:
        print(f"[OMR] ️  Edge length mismatch: h_ratio={h_ratio:.2f}, v_ratio={v_ratio:.2f}")
        worst_name = _find_geometry_outlier(marker_data, get_point_fn)
        if worst_name:
            print(f"[OMR] Removing geometric outlier: {worst_name}")
            del marker_data[worst_name]
            return marker_data
    
    print(f"[OMR]  Marker geometry valid: aspect={aspect:.3f}, "
          f"h_angle={h_angle:.1f}°, v_angle={v_angle:.1f}°, "
          f"h_ratio={h_ratio:.2f}, v_ratio={v_ratio:.2f}")
    return marker_data


def _find_geometry_outlier(marker_data, get_point_fn):
    """
    Find which marker, when removed, yields the best parallelogram
    from the remaining 3 points (estimated 4th via vector addition).
    
    For each candidate removal, estimate the missing corner and compute
    the aspect ratio of the resulting quadrilateral. The removal that
    gives an aspect ratio closest to 0.75 (A4 portrait) wins.
    """
    names = ['TL', 'TR', 'BL', 'BR']
    pts = {n: np.array(get_point_fn(n, marker_data[n])) for n in names}
    
    best_name = None
    best_score = float('inf')
    target_aspect = 0.75  # A4 paper
    
    for remove_name in names:
        remaining = [n for n in names if n != remove_name]
        p = {n: pts[n] for n in remaining}
        
 # Estimate the missing corner using parallelogram property
        a, b, c = remaining  # 3 remaining corners
        
 # Try to estimate the 4th point
        if remove_name == 'BR':
            est = pts['TR'] + pts['BL'] - pts['TL']
        elif remove_name == 'BL':
            est = pts['TL'] + pts['BR'] - pts['TR']
        elif remove_name == 'TR':
            est = pts['TL'] + pts['BR'] - pts['BL']
        elif remove_name == 'TL':
            est = pts['TR'] + pts['BL'] - pts['BR']
        
 # Compute aspect ratio with estimated point
        all_pts = dict(p)
        all_pts[remove_name] = est
        
        tl, tr = all_pts['TL'], all_pts['TR']
        bl, br = all_pts['BL'], all_pts['BR']
        
        avg_w = (np.linalg.norm(tr - tl) + np.linalg.norm(br - bl)) / 2
        avg_h = (np.linalg.norm(bl - tl) + np.linalg.norm(br - tr)) / 2
        
        if avg_h < 1:
            continue
        
        aspect = avg_w / avg_h
        score = abs(aspect - target_aspect)
        
        if score < best_score:
            best_score = score
            best_name = remove_name
    
    return best_name


def _find_corner_markers(gray):
    """
    Try to find 4 black square corner markers in the image.
    Uses CLAHE preprocessing + multiple threshold levels for robustness.

    KEY FILTER: Markers are black squares ON WHITE PAPER. The surrounding
    pixels (just outside the marker) must be bright (paper surface, >140).
    This eliminates false positives from dark objects on the desk.

    Returns: 4-point contour (numpy array of float32) or None
    """
    h, w = gray.shape

 # Expected marker size: ~0.6cm on A4 width (21cm) => ~2.8% of paper width
 # BUT if the photo is taken from far away, the paper might only occupy 30-40% of the image width.
 # We must broaden the acceptable range to allow for small papers in large images.
    short_side = min(w, h)
    min_marker_dim = max(5, int(short_side * 0.008))  # Works if paper is ~30% of the image width
    max_marker_dim = max(15, int(short_side * 0.060)) # Works if paper is ~100% of the image width (close up)
    min_area = min_marker_dim ** 2
    max_area = max_marker_dim ** 2

    print(f"[OMR] Marker detection: image={w}x{h}, expected marker size={min_marker_dim}-{max_marker_dim}px")

 # CLAHE to normalize contrast (handles shadows on corners)
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

 # Try multiple threshold values — bottom corners may be under shadow
    threshold_levels = [40, 60, 80, 100, 120, 140]

 # Store marker data
    marker_data = {}

    for thresh_val in threshold_levels:
        _, binary = cv2.threshold(enhanced, thresh_val, 255, cv2.THRESH_BINARY_INV)

 # Morphological open to remove thin noise (text, lines)
        kernel_open = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel_open)

 # Search zone: 40% from each edge (wider than 25% to handle photos
 # where paper occupies only ~60% of the image with desk visible)
        corner_size_y = int(h * 0.40)
        corner_size_x = int(w * 0.40)

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

            candidates = []

            for c in cnts:
                area = cv2.contourArea(c)
                if area < min_area or area > max_area:
                    continue
                (bx, by, bw, bh) = cv2.boundingRect(c)
                if bw < min_marker_dim or bh < min_marker_dim:
                    continue
                if bw > max_marker_dim or bh > max_marker_dim:
                    continue
                ar = bw / float(bh) if bh > 0 else 0
                if not (0.6 <= ar <= 1.7):
                    continue
 # Solidity check (square should be very solid)
                hull_area = cv2.contourArea(cv2.convexHull(c))
                solidity = area / hull_area if hull_area > 0 else 0
                if solidity < 0.85:
                    continue
 # Fill ratio (square should fill its bounding box)
                bbox_area = bw * bh
                fill = area / bbox_area if bbox_area > 0 else 0
                if fill < 0.75:
                    continue

 # KEY: Surrounding brightness — marker must be on PAPER
 # Sample CLAHE-enhanced image (shadow-normalized) in a ring
 # around the marker. Uses two checks:
 # 1. Absolute brightness (surround > 100) — catches most cases
 # 2. Contrast (surround - interior > 15) — catches shadowed areas
 # A candidate must pass at least one check.
                margin = max(5, max(bw, bh) // 2)
                gx, gy = x1 + bx, y1 + by  # global coordinates

                surround_pixels = []
 # Top strip
                ty1, ty2 = max(0, gy - margin), gy
                if ty1 < ty2:
                    s = enhanced[ty1:ty2, max(0, gx):min(w, gx + bw)]
                    if s.size > 0: surround_pixels.extend(s.flatten().tolist())
 # Bottom strip
                by1, by2 = gy + bh, min(h, gy + bh + margin)
                if by1 < by2:
                    s = enhanced[by1:by2, max(0, gx):min(w, gx + bw)]
                    if s.size > 0: surround_pixels.extend(s.flatten().tolist())
 # Left strip
                lx1, lx2 = max(0, gx - margin), gx
                if lx1 < lx2:
                    s = enhanced[max(0, gy):min(h, gy + bh), lx1:lx2]
                    if s.size > 0: surround_pixels.extend(s.flatten().tolist())
 # Right strip
                rx1, rx2 = gx + bw, min(w, gx + bw + margin)
                if rx1 < rx2:
                    s = enhanced[max(0, gy):min(h, gy + bh), rx1:rx2]
                    if s.size > 0: surround_pixels.extend(s.flatten().tolist())

                if len(surround_pixels) < 10:
                    continue

                avg_surround = float(np.mean(surround_pixels))
 # Contrast check: surround must be brighter than marker interior
 # Use original gray to check true ink intensity, preventing CLAHE from skewing shadows
                interior_roi = gray[gy:gy+bh, gx:gx+bw]
                avg_interior = float(np.mean(interior_roi)) if interior_roi.size > 0 else 255
                std_interior = float(np.std(interior_roi)) if interior_roi.size > 0 else 255
                
 # A true printed marker is a solid block of black ink.
 # It should be dark and have very little texture/variance.
 # Non-markers (like cars, pens, complex shadows) have texture (high std) or aren't black enough.
                if avg_interior > 130:
                    continue
                if std_interior > 40:
                    continue
                    
                contrast = avg_surround - avg_interior
 # shadowed paper where marker is still clearly darker than paper.
 # Dark objects on desk have low surround AND low contrast → rejected.
                is_bright = avg_surround >= 90
                is_shadowed_paper = avg_surround >= 70 and contrast >= 25
                if not (is_bright or is_shadowed_paper):
                    continue

                squareness = 1.0 - abs(1.0 - ar)
                base_score = area * squareness * solidity * fill * (avg_surround / 255.0)

 # Penalize candidates that are far from the actual corner.
 # Since the search zone is 40%, inner bubbles might be picked if not penalized.
                cx, cy = gx + bw / 2.0, gy + bh / 2.0
                dist_x, dist_y = 0, 0
                if name == 'TL':
                    dist_x, dist_y = cx, cy
                elif name == 'TR':
                    dist_x, dist_y = w - cx, cy
                elif name == 'BL':
                    dist_x, dist_y = cx, h - cy
                elif name == 'BR':
                    dist_x, dist_y = w - cx, h - cy

 # Normalize distance against the search zone size (1.0 = at corner, 0.0 = at inner edge)
                norm_x = min(1.0, dist_x / corner_size_x)
                norm_y = min(1.0, dist_y / corner_size_y)
                dist_penalty = max(0.1, 1.0 - ((norm_x + norm_y) / 2.0))

 # Hard reject candidates too far from the corner zone center.
                if dist_penalty <= 0.2:
                    continue

 # Strongly penalize inner candidates to avoid bubble false positives.
                score = base_score * (dist_penalty ** 4)

                candidates.append({
                    'bx': gx, 'by': gy, 'bw': bw, 'bh': bh,
                    'score': score, 'surround': avg_surround,
                })

            if candidates:
                best = max(candidates, key=lambda c: c['score'])
                marker_data[name] = best
                print(f"[OMR]   {name}: ({best['bx']},{best['by']}) "
                      f"size={best['bw']}x{best['bh']} "
                      f"surround={best['surround']:.0f} thresh={thresh_val}")

        if len(marker_data) == 4:
            break

    print(f"[OMR] Corner markers found: {list(marker_data.keys())} / 4")
    for name, m in marker_data.items():
        cx = m['bx'] + m['bw'] / 2.0
        cy = m['by'] + m['bh'] / 2.0
        print(f"[OMR]   {name}: bbox=({m['bx']},{m['by']}) size={m['bw']}x{m['bh']} center=({cx:.1f},{cy:.1f})")

 # DEBUG: Save marker detection visualization
    debug_markers = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
    for name, m in marker_data.items():
        bx, by, bw, bh = m['bx'], m['by'], m['bw'], m['bh']
        cx = int(bx + bw / 2.0)
        cy = int(by + bh / 2.0)
        cv2.rectangle(debug_markers, (bx, by), (bx + bw, by + bh), (0, 255, 0), 2)
        cv2.circle(debug_markers, (cx, cy), 4, (0, 0, 255), -1)
        cv2.putText(debug_markers, name, (bx, by - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
    _save_debug("debug_marker_boxes.jpg", debug_markers)

 # Build the 4-point contour using CENTER of each marker.
 # Center gives the most stable reference point:
 # - Outer corner extends into the background when markers are near image edges
 # - Center is always on the paper, giving a clean warp
    def _get_marker_point(name, m):
        """Return the center point of a marker with sub-pixel accuracy."""
        bx, by, bw, bh = m['bx'], m['by'], m['bw'], m['bh']
 # Use float division for sub-pixel accuracy — integer division
 # introduces up to 0.5px error per marker, which gets amplified
 # to ~2-3px drift on the far side after perspective warp
        return (bx + bw / 2.0, by + bh / 2.0)

 # GEOMETRIC VALIDATION: Detect and remove false-positive markers
 # When Pass 1 fails (no paper contour, full image used), the search
 # zones include desk area. Dark objects on bright desk can pass the
 # brightness filter. We validate that the 4 markers form a reasonable
 # rectangle matching paper proportions.
    if len(marker_data) == 4:
        marker_data = _validate_marker_geometry(marker_data, _get_marker_point, w, h)

    if len(marker_data) == 4:
        pts = np.array([
            _get_marker_point('TL', marker_data['TL']),
            _get_marker_point('TR', marker_data['TR']),
            _get_marker_point('BR', marker_data['BR']),
            _get_marker_point('BL', marker_data['BL']),
        ], dtype=np.float32)
        print(f"[OMR]  4 corners (center): TL={pts[0].tolist()}, TR={pts[1].tolist()}, BR={pts[2].tolist()}, BL={pts[3].tolist()}")
        return pts.reshape(4, 1, 2).astype(np.float32)

 # Return None if not exactly 4 markers are found
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
 # header_end_y = 1 * (h/11) ← end of the header input box row
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


# v2.0 GRID-BASED SCANNING (with timing mark Y-calibration)

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

def _precompute_ring_response(thresh, bubble_radius):
    """
    Precompute ring overlap map using cv2.filter2D (single optimized C++ call).
    ring_response[y, x] = count of white thresh pixels under the ring mask at (x,y).
    Replaces thousands of ROI extractions with simple array lookups.
    """
    ir = int(round(bubble_radius))
    if ir < 3:
        return np.zeros_like(thresh, dtype=np.float32)
    ring_kernel = np.zeros((2 * ir + 1, 2 * ir + 1), dtype=np.float32)
    cv2.circle(ring_kernel, (ir, ir), ir, 1.0, -1)
    cv2.circle(ring_kernel, (ir, ir), max(1, ir - 2), 0.0, -1)
    thresh_f = (thresh > 0).astype(np.float32)
    return cv2.filter2D(thresh_f, -1, ring_kernel)


def _align_column_xy(ring_response, cx, row_ys, bubble_radius, max_shift_x=10, max_shift_y=12):
    """Find local X/Y shifts using precomputed ring_response (array lookups only)."""
    h, w = ring_response.shape
    ir = int(round(bubble_radius))
    if ir < 3: return (0, 0)
    ix_base = int(round(cx))

 # Independent Y search
    best_dy, max_fill = 0, -1.0
    for dy in range(-max_shift_y, max_shift_y + 1):
        total = 0.0
        for cy in row_ys:
            iy = int(round(cy + dy))
            if 0 <= iy < h and 0 <= ix_base < w:
                total += ring_response[iy, ix_base]
        if total > max_fill:
            max_fill = total
            best_dy = dy

 # Independent X search using best_dy
    best_dx, max_fill = 0, -1.0
    for dx in range(-max_shift_x, max_shift_x + 1):
        ix = ix_base + dx
        if ix < 0 or ix >= w: continue
        total = 0.0
        for cy in row_ys:
            iy = int(round(cy + best_dy))
            if 0 <= iy < h:
                total += ring_response[iy, ix]
        if total > max_fill:
            max_fill = total
            best_dx = dx
    return best_dx, best_dy


def _align_block_xy(ring_response, block, y_corrections, bubble_radius, max_shift_x=10, max_shift_y=12):
    """Find local X/Y shifts for entire block using precomputed ring_response."""
    origin_x = block['origin']['x']
    origin_y = block['origin']['y']
    cols, rows = block['cols'], block['rows']
    gap_x, gap_y = block['gap_x'], block['gap_y']
    block_size = block.get('block_size', rows)
    block_gap_y = block.get('block_gap_y', 0)
    h, w = ring_response.shape
    ir = int(round(bubble_radius))
    if ir < 3: return (0, 0)

    bubbles = []
    for row in range(rows):
        num_gaps = row // block_size if block_size > 0 else 0
        base_y = _get_calibrated_y(origin_y + row * gap_y + num_gaps * block_gap_y, y_corrections)
        for col in range(cols):
            bubbles.append((int(round(origin_x + col * gap_x)), base_y))

    best_dy, max_fill = 0, -1.0
    for dy in range(-max_shift_y, max_shift_y + 1):
        total = 0.0
        for ix, by in bubbles:
            iy = int(round(by + dy))
            if 0 <= iy < h and 0 <= ix < w:
                total += ring_response[iy, ix]
        if total > max_fill:
            max_fill = total
            best_dy = dy

    best_dx, max_fill = 0, -1.0
    for dx in range(-max_shift_x, max_shift_x + 1):
        total = 0.0
        for ix, by in bubbles:
            nix = ix + dx
            iy = int(round(by + best_dy))
            if 0 <= iy < h and 0 <= nix < w:
                total += ring_response[iy, nix]
        if total > max_fill:
            max_fill = total
            best_dx = dx
    return best_dx, best_dy



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
    sampling_radius = max(5.0, bubble_radius * 0.7)
    col_shifts = []
    ring_response = _precompute_ring_response(thresh, bubble_radius)

    for col in range(cols):
        cx = origin_x + col * gap_x
        row_fills = []

        base_ys = [_get_calibrated_y(origin_y + r * gap_y, y_corrections) for r in range(rows)]
        best_dx, best_dy = _align_column_xy(ring_response, cx, base_ys, bubble_radius)
        col_shifts.append((best_dx, best_dy))

        actual_cx = cx + best_dx

        for row in range(rows):
            actual_y = base_ys[row] + best_dy
            fill = _sample_bubble_fill(thresh, actual_cx, actual_y, sampling_radius)
            row_fills.append(fill)

 # Find the filled bubble using relative comparison
        max_fill = max(row_fills) if row_fills else 0
        median_fill = float(np.median(row_fills)) if row_fills else 0

 # Baseline safeguards against median=0 when sampling pure inner core of empty bubbles
        baseline = max(median_fill, 2.0)
        best_digit = None
        if max_fill > 15 and max_fill >= baseline * fill_ratio:
            best_digit = str(np.argmax(row_fills))

        detected.append(best_digit)

        if OMR_DEBUG:
            fills_str = ', '.join(f'{f:4d}' for f in row_fills)
            print(f"[OMR] col{col} digit={best_digit} dx={best_dx:+d} dy={best_dy:+d} fills=[{fills_str}]")

 # Debug visualization
    if debug_name:
        h, w = thresh.shape
        debug_img = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)
        for col in range(cols):
            cx = origin_x + col * gap_x
            best_dx, best_dy = col_shifts[col]
            actual_cx = cx + best_dx
            for row in range(rows):
                expected_y = origin_y + row * gap_y
                actual_y = _get_calibrated_y(expected_y, y_corrections) + best_dy
                
 # Draw expected outer ring (green)
                cv2.circle(debug_img, (int(actual_cx), int(actual_y)), int(bubble_radius), (0, 200, 0), 1)
 # Draw actual sampling region (cyan dotted)
                cv2.circle(debug_img, (int(actual_cx), int(actual_y)), int(sampling_radius), (255, 255, 0), 1)
                
 # Mark detected digit
            if detected[col] is not None:
                dr = int(detected[col])
                dy = origin_y + dr * gap_y
                dy = _get_calibrated_y(dy, y_corrections) + best_dy
                cv2.circle(debug_img, (int(actual_cx), int(dy)), int(sampling_radius), (0, 0, 255), 2)
                cv2.circle(debug_img, (int(actual_cx), int(dy)), 2, (0, 0, 255), -1)
        _save_debug(debug_name, debug_img)

    return detected


def _detect_answers_v2(thresh, template, y_corrections, bubble_radius, num_questions):
    """
    Detect answers from v2.0 answer_grid blocks using grid-based sampling.

    For each question, samples fill at each choice position. Uses relative
    fill comparison to determine selected answer(s).

    Returns: {question_index: [selected_choice_indices]}
    """
    h, w = thresh.shape
    answer_blocks = get_all_answer_blocks(template)

    detected_answers = {}
    _debug_block_data = []
    
    sampling_radius = max(5.0, bubble_radius * 0.7)
    sampling_area = math.pi * (sampling_radius ** 2)

 # Precompute ring response ONCE for the entire image
    ring_response = _precompute_ring_response(thresh, bubble_radius)

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
        
        min_fill = block.get('thresholds', {}).get('min_fill_pixels', 80)
        dynamic_min_fill = max(15, int(sampling_area * 0.30))
        if min_fill > dynamic_min_fill:
            min_fill = dynamic_min_fill

        background_ratio = 1.6

 # Block-level alignment using precomputed ring_response
        best_dx, best_dy = _align_block_xy(ring_response, block, y_corrections, bubble_radius)
        if OMR_DEBUG:
            print(f"[OMR] Block {block_name}: dx={best_dx:+d} dy={best_dy:+d}")

        block_rows_debug = []

        for row in range(rows):
            q_idx = q_start + row
            if q_idx >= num_questions:
                break

            num_gaps = row // block_size if block_size > 0 else 0
            expected_y = origin_y + row * gap_y + num_gaps * block_gap_y
            base_y = _get_calibrated_y(expected_y, y_corrections) + best_dy

 # Row-level XY-refinement using ring_response (array lookups, no ROI)
            local_dx, local_dy = 0, 0
 # Find local_dy
            max_y_fill = -1.0
            for d_y in range(-8, 9):
                rf = 0.0
                for col in range(cols):
                    ix = int(round(origin_x + col * gap_x + best_dx))
                    iy = int(round(base_y + d_y))
                    if 0 <= iy < h and 0 <= ix < w:
                        rf += ring_response[iy, ix]
                if rf > max_y_fill:
                    max_y_fill = rf
                    local_dy = d_y
 # Find local_dx
            max_x_fill = -1.0
            for d_x in range(-8, 9):
                rf = 0.0
                for col in range(cols):
                    ix = int(round(origin_x + col * gap_x + best_dx + d_x))
                    iy = int(round(base_y + local_dy))
                    if 0 <= iy < h and 0 <= ix < w:
                        rf += ring_response[iy, ix]
                if rf > max_x_fill:
                    max_x_fill = rf
                    local_dx = d_x

            actual_y = base_y + local_dy
            row_dx = best_dx + local_dx

            choice_fills = []
            for col in range(cols):
                cx = origin_x + col * gap_x
                actual_cx = cx + row_dx
                fill = _sample_bubble_fill(thresh, actual_cx, actual_y, sampling_radius)
                choice_fills.append(fill)

            max_fill = max(choice_fills) if choice_fills else 0
            lowest_fill = min(choice_fills) if choice_fills else 0
            baseline = max(lowest_fill, 2.0)
            has_clear_empty = lowest_fill < max_fill * 0.40

            # A real mark should be close enough to the darkest mark in the
            # row. This keeps erased/light residue from being selected while
            # still allowing multi-answer rows such as A+B+C.
            threshold = max(min_fill, max_fill * 0.55)
            if has_clear_empty:
                threshold = max(threshold, baseline * background_ratio)
            
            selected = []
            for ci, fill in enumerate(choice_fills):
                if fill >= threshold:
                    selected.append(ci)

            detected_answers[q_idx] = selected
            block_rows_debug.append((q_idx, row_dx, actual_y, choice_fills, selected))

 # Only print anomalies in production, all in debug
            if len(selected) == 0:
                print(f"[OMR] Q{q_idx+1}: BLANK fills={choice_fills}")
            elif len(selected) > 1:
                print(f"[OMR] Q{q_idx+1}: MULTIPLE={selected} fills={choice_fills}")
            elif OMR_DEBUG:
                label = chr(65 + selected[0])
                print(f"[OMR] Q{q_idx+1}: {label} fills={choice_fills}")

        _debug_block_data.append((block_name, block, block_rows_debug, best_dx, best_dy))

    _save_answers_debug(thresh, _debug_block_data, sampling_radius)

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

    for block_name, block, rows_debug, best_dx, best_dy in block_data:
        origin_x = block['origin']['x']
        gap_x = block['gap_x']
        cols = block['cols']

        for q_idx, row_dx, actual_y, choice_fills, selected in rows_debug:
            for col in range(cols):
                cx = int(origin_x + col * gap_x + row_dx)
                cy = int(actual_y)

                if col in selected:
 # Detected answer → filled red circle
                    cv2.circle(overlay, (cx, cy), r, (0, 0, 255), 2)
                    cv2.circle(overlay, (cx, cy), r - 2, (0, 0, 255), cv2.FILLED)
                else:
 # Empty bubble → thin green circle
                    cv2.circle(overlay, (cx, cy), r, (0, 180, 0), 1)

 # Question label
            first_cx = int(origin_x + row_dx)
            cv2.putText(overlay, f"Q{q_idx+1}", (first_cx - 35, int(actual_y) + 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 200, 0), 1)

    _save_debug("debug_answers_overlay.jpg", overlay)

 # --- 2. Per-column crops with fill annotations ---
    for col_idx, (block_name, block, rows_debug, best_dx, best_dy) in enumerate(block_data):
        if not rows_debug:
            continue

        origin_x = block['origin']['x']
        gap_x = block['gap_x']
        cols = block['cols']

 # Compute crop region
        x1 = max(0, int(origin_x + best_dx - gap_x - 40))
        x2 = min(w, int(origin_x + best_dx + cols * gap_x + gap_x))
        y1 = max(0, int(rows_debug[0][2] - bubble_radius - 15))
        y2 = min(h, int(rows_debug[-1][2] + bubble_radius + 15))

        crop = cv2.cvtColor(thresh[y1:y2, x1:x2], cv2.COLOR_GRAY2BGR)

        for q_idx, row_dx, actual_y, choice_fills, selected in rows_debug:
            for col in range(cols):
                cx = int(origin_x + col * gap_x + row_dx) - x1
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
        raise Exception("Cannot determine, please capture again.") from exc

    bubble_radius = template.get('bubble_radius_px', 9.0)
    num_questions = test.num_questions

    if OMR_DEBUG:
        print("[OMR] Timing mark calibration")
    y_corrections = _calibrate_timing_marks(thresh, template)

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


    sid_block = get_block(template, 'student_id')
    mssv_digits = _detect_digits_v2(
        thresh, sid_block, y_corrections, bubble_radius,
        debug_name="debug_grid_mssv_v2.jpg"
    )

 # --- AUTO-ROTATION 180° ---
 # If all digits are None/'?', the sheet might be upside down.
    valid_digit_count = sum(1 for d in mssv_digits if d is not None)
    if valid_digit_count == 0:
        print("[OMR] Student ID blank — trying 180° rotation")
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
            print(f"[OMR] 180° rotation improved: {valid_digit_count}→{valid_r} valid digits")
            paper, warped, thresh = paper_r, warped_r, thresh_r
            y_corrections = y_corrections_r
            mssv_digits = mssv_digits_r
        else:
            if OMR_DEBUG:
                print("[OMR] 180° rotation did not help")

    mssv = ''.join(d if d is not None else '?' for d in mssv_digits)
    print(f"[OMR] MSSV: {mssv}")
    
    if '?' in mssv:
        raise Exception("Cannot determine Student ID, please capture again.")


    tid_block = get_block(template, 'test_id')
    variant_digits = _detect_digits_v2(
        thresh, tid_block, y_corrections, bubble_radius,
        debug_name="debug_grid_variant_v2.jpg"
    )
    for i, d in enumerate(variant_digits):
        if d is None:
            raise Exception("Cannot determine Test ID, please capture again.")
    variant_code = ''.join(variant_digits)
    print(f"[OMR] Variant: {variant_code}")

    debug_regions = paper.copy()
    _draw_block_debug(debug_regions, sid_block, y_corrections,
                      bubble_radius, mssv_digits, (255, 100, 0), "MSSV")
    _draw_block_debug(debug_regions, tid_block, y_corrections,
                      bubble_radius, variant_digits, (0, 0, 255), "TEST_ID")
    _save_debug("debug_header_regions_v2.jpg", debug_regions)

    if OMR_DEBUG:
        print("[OMR] Detecting answers")
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


# GRADED IMAGE OVERLAY

def draw_graded_overlay(paper, template, y_corrections, bubble_radius,
                        detected_answers, answer_key, num_questions,
                        correct_count, total_questions,
                        allow_multiple_answers=True):
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

    # Single overlay layer for ALL transparent fills (1 copy instead of N copies)
    overlay = result.copy()
    # Track positions for border drawing after blend
    border_draws = []  # list of (cx, cy, r, color)

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

            if len(user_selected) == 0:
 # Draw a yellow line (like a timing mark) to the left of the row
                cx_first = int(origin_x)
                cv2.line(result, (cx_first - 25, int(actual_y)), (cx_first - 5, int(actual_y)), (0, 255, 255), 3)
                cv2.line(overlay, (cx_first - 25, int(actual_y)), (cx_first - 5, int(actual_y)), (0, 255, 255), 3)
                continue

            for col in range(cols):
                cx = int(origin_x + col * gap_x)
                cy = int(actual_y)

                is_selected = col in user_selected
                is_correct_choice = col in correct_set

                if is_selected and is_correct_choice:
 # Student picked this AND it's correct → GREEN FILL on overlay
                    cv2.circle(overlay, (cx, cy), r, GREEN, cv2.FILLED)
                    border_draws.append((cx, cy, r, GREEN))

                elif is_selected and not is_correct_choice:
 # Student picked this BUT it's wrong → RED FILL on overlay
                    cv2.circle(overlay, (cx, cy), r, RED, cv2.FILLED)
                    border_draws.append((cx, cy, r, RED))

                elif not is_selected and is_correct_choice:
 # Correct answer the student missed → GREEN HOLLOW RING (no fill needed)
                    border_draws.append((cx, cy, r + 2, GREEN))

    # Single blend operation for ALL transparent fills
    cv2.addWeighted(overlay, ALPHA, result, 1 - ALPHA, 0, result)

    # Draw borders AFTER blend so they are crisp (not transparent)
    for cx, cy, r, color in border_draws:
        cv2.circle(result, (cx, cy), r, color, 2)

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


# SUBMISSION PROCESSING PIPELINE

def process_submission_local(submission_id, local_image_path):
    """
    Process submission from a LOCAL file path (zero Cloudinary downloads).

    Returns: (submission, graded_base64)
        - submission: updated PaperSubmission object
        - graded_base64: base64-encoded JPEG of the graded overlay
          (for instant frontend display without waiting for Cloudinary)

    Cloudinary upload of the graded image happens in a background thread
    so it doesn't block the HTTP response.
    """
    pipeline_start = time.perf_counter()
    try:
        submission = PaperSubmission.objects.get(id=submission_id)
        test = submission.test

        print(f"[OMR] Processing submission {submission_id} for test '{test.title}'")

        original_input = cv2.imread(local_image_path)
        if original_input is not None:
            _save_debug("debug_original_input.jpg", original_input)

        t0 = time.perf_counter()
        mssv, variant_code, detected_answers, paper, template, y_corrections, bubble_radius = \
            detect_all_from_image(local_image_path, test)
        detect_ms = (time.perf_counter() - t0) * 1000
        print(f"[OMR] Detection: {detect_ms:.0f}ms | MSSV={mssv} Variant={variant_code}")

        submission.detected_mssv = mssv

        try:
            variant = PaperTestVariant.objects.get(test=test, variant_code=variant_code)
            submission.variant = variant
            submission.save()
        except PaperTestVariant.DoesNotExist:
            raise Exception("Cannot determine Test ID, please capture again.")

        answer_key = variant.get_answer_key()

        correct_count = 0
        total_questions = test.num_questions
        paper_questions = {pq.question.id: pq for pq in test.paper_questions.all()}

        with transaction.atomic():
            PaperAnswerDetected.objects.filter(submission=submission).delete()
            PaperUserAnswer.objects.filter(submission=submission).delete()

            # Bulk create instead of one-by-one INSERT (2 queries instead of 2*N)
            answers_to_create = []
            user_answers_to_create = []

            for question_index, user_answer_indices in detected_answers.items():
                if question_index >= len(variant.question_order):
                    continue
                question_id = variant.question_order[question_index]
                paper_question = paper_questions.get(question_id)
                if not paper_question:
                    continue

                correct_indices_set = set(answer_key.get(question_index, []))
                user_indices_set = set(user_answer_indices)
                if not test.allow_multiple_answers and len(user_indices_set) > 1:
                    is_correct = False
                else:
                    is_correct = (
                        correct_indices_set == user_indices_set
                        and len(user_indices_set) > 0
                    )
                if is_correct:
                    correct_count += 1

                answers_to_create.append(PaperAnswerDetected(
                    submission=submission,
                    question=paper_question,
                    is_correct=is_correct,
                    score=1.0 if is_correct else 0.0
                ))
                user_answers_to_create.append(PaperUserAnswer(
                    submission=submission,
                    question=paper_question,
                    selected_options=list(user_indices_set)
                ))

            PaperAnswerDetected.objects.bulk_create(answers_to_create)
            PaperUserAnswer.objects.bulk_create(user_answers_to_create)

            final_score = (correct_count / total_questions) * 10 if total_questions > 0 else 0
            submission.total_score = round(final_score, 2)
            submission.save()

        print(f"[OMR] Graded: {final_score}/10 ({correct_count}/{total_questions}) - Variant {variant_code} - MSSV {mssv}")

        _save_grading_comparison(
            detected_answers, answer_key, test.num_questions,
            correct_count, total_questions, variant_code, mssv
        )

        graded_image = draw_graded_overlay(
            paper, template, y_corrections, bubble_radius,
            detected_answers, answer_key, test.num_questions,
            correct_count, total_questions,
            allow_multiple_answers=test.allow_multiple_answers
        )
        _save_debug("debug_graded_result.jpg", graded_image)

 # Encode graded image as Base64 for instant frontend display
        _, buffer = cv2.imencode('.jpg', graded_image, [cv2.IMWRITE_JPEG_QUALITY, 85])
        graded_base64 = base64.b64encode(buffer).decode('utf-8')

        def _upload_graded_to_cloudinary(sub_id, img_data):
            """Upload graded image in background thread (doesn't block response)."""
            try:
                import django
                django.setup()
                from exam.models import PaperSubmission as PS
 # Write to temp file for cloudinary upload
                with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as f:
                    f.write(img_data)
                    tmp_path = f.name
                try:
                    result = cloudinary.uploader.upload(
                        tmp_path,
                        folder='testgen/graded',
                        resource_type='image',
                    )
                    sub = PS.objects.get(id=sub_id)
                    sub.submission_image = result['secure_url']
                    sub.save()
                    print(f"[OMR] Background: Graded image uploaded → {result['secure_url']}")
                finally:
                    try:
                        os.unlink(tmp_path)
                    except:
                        pass
            except Exception as e:
                print(f"[OMR] Background upload failed: {e}")

        import threading
        thread = threading.Thread(
            target=_upload_graded_to_cloudinary,
            args=(submission.id, buffer.tobytes()),
            daemon=True
        )
        thread.start()

        total_ms = (time.perf_counter() - pipeline_start) * 1000
        print(f"[OMR] ⏱️  TOTAL PIPELINE: {total_ms:.0f}ms (detection={detect_ms:.0f}ms)")

        return submission, graded_base64

    except Exception as e:
        print(f"Error processing submission {submission_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
