"""
Script calibrate: Chạy trên ảnh debug_thresh.jpg (800x1000) để tìm tọa độ chính xác.
Vẽ các vùng crop lên ảnh và lưu debug_calibrate.jpg để kiểm tra trực quan.

Cách dùng:
    python api/calibrate_coords.py
"""
import cv2
import numpy as np
import os

DEBUG_DIR = os.path.dirname(os.path.abspath(__file__))

# Load the resized thresh image
thresh_path = os.path.join(DEBUG_DIR, "debug_thresh.jpg")
img = cv2.imread(thresh_path)
if img is None:
    print(f"Cannot load {thresh_path}")
    exit(1)

h, w = img.shape[:2]
print(f"Image size: {w}x{h}")

# ===== Auto-detect STUDENT ID and TEST ID regions =====
# Convert to grayscale if needed
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img.copy()

# Look for the text labels "STUDENT ID" and "TEST ID" by scanning for dense white regions
# in the top portion of the image
#
# Strategy: find horizontal bands of high pixel density in the header area

# Instead of auto-detect, let's scan the thresh image and find where bubbles are
# by looking at column density
print("\n===== Column density scan (top 50% of image) =====")
top_half = gray[:h//2, :]
col_sums = np.sum(top_half > 128, axis=0)

# Smooth
kernel_size = 10
col_smooth = np.convolve(col_sums, np.ones(kernel_size)/kernel_size, mode='same')

# Find active column ranges
threshold_col = col_smooth.max() * 0.15
active_cols = col_smooth > threshold_col

# Find contiguous active bands
bands = []
in_band = False
for i in range(len(active_cols)):
    if active_cols[i] and not in_band:
        start = i
        in_band = True
    elif not active_cols[i] and in_band:
        bands.append((start, i-1))
        in_band = False
if in_band:
    bands.append((start, len(active_cols)-1))

# Filter tiny bands
bands = [(s, e) for s, e in bands if e - s > 20]
print(f"Column bands: {bands}")
for i, (s, e) in enumerate(bands):
    print(f"  Band {i}: x={s}..{e} (width={e-s}px, relative={s/w:.3f}..{e/w:.3f})")

# Now find row density in the header area
print("\n===== Row density scan (full width) =====")
row_sums = np.sum(gray > 128, axis=1)
row_smooth = np.convolve(row_sums, np.ones(5)/5, mode='same')

# Find where bubble grids start and end vertically
row_threshold = row_smooth.max() * 0.1
active_rows = row_smooth > row_threshold

row_bands = []
in_band = False
for i in range(len(active_rows)):
    if active_rows[i] and not in_band:
        start = i
        in_band = True
    elif not active_rows[i] and in_band:
        row_bands.append((start, i-1))
        in_band = False
if in_band:
    row_bands.append((start, len(active_rows)-1))

row_bands = [(s, e) for s, e in row_bands if e - s > 15]
print(f"Row bands: {row_bands}")
for i, (s, e) in enumerate(row_bands):
    print(f"  Row band {i}: y={s}..{e} (height={e-s}px, relative={s/h:.3f}..{e/h:.3f})")

# ===== Draw candidate regions on image for visual verification =====
debug_img = img.copy() if len(img.shape) == 3 else cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

# Draw column bands
for i, (s, e) in enumerate(bands):
    color = (0, 255, 0) if i < 2 else (255, 0, 0)
    cv2.line(debug_img, (s, 0), (s, h), color, 1)
    cv2.line(debug_img, (e, 0), (e, h), color, 1)
    cv2.putText(debug_img, f"B{i}:{s}-{e}", (s, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

# Draw row bands
for i, (s, e) in enumerate(row_bands):
    color = (0, 200, 255)
    cv2.line(debug_img, (0, s), (w, s), color, 1)
    cv2.line(debug_img, (0, e), (w, e), color, 1)
    cv2.putText(debug_img, f"R{i}:{s}-{e}", (5, s+15), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

# Also draw the CURRENT template regions for comparison (in RED)
# Read current template
import json
template_path = os.path.join(DEBUG_DIR, "exam", "omr_template.json")
with open(template_path) as f:
    tpl = json.load(f)

for name, color in [("student_id", (255, 0, 0)), ("variant_code", (0, 0, 255))]:
    rel = tpl["regions"][name]["relative"]
    x1 = int(rel["x_left"] * w)
    x2 = int(rel["x_right"] * w)
    y1 = int(rel["y_top"] * h)
    y2 = int(rel["y_bottom"] * h)
    cv2.rectangle(debug_img, (x1, y1), (x2, y2), color, 2)
    cv2.putText(debug_img, f"TPL:{name}", (x1, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

output_path = os.path.join(DEBUG_DIR, "debug_calibrate.jpg")
cv2.imwrite(output_path, debug_img)
print(f"\nSaved: {output_path}")
print("\n===== SUGGESTED template coordinates =====")
if len(bands) >= 2:
    # First band = STUDENT ID columns, second band = TEST ID columns
    sid_x1, sid_x2 = bands[0]
    tid_x1, tid_x2 = bands[1]
    
    # Y range: typically first row band that's tall enough (bubble grid)
    # Filter for bands in the header area (top 50%)
    header_row_bands = [(s, e) for s, e in row_bands if s < h * 0.5 and e - s > 50]
    if header_row_bands:
        bubble_y1 = header_row_bands[0][0]
        bubble_y2 = header_row_bands[0][1]
    else:
        bubble_y1, bubble_y2 = int(h*0.15), int(h*0.42)
    
    print(f"student_id:")
    print(f'  "x_left": {sid_x1/w:.3f},  "x_right": {sid_x2/w:.3f}')
    print(f'  "y_top": {bubble_y1/h:.3f},  "y_bottom": {bubble_y2/h:.3f}')
    print(f"  → pixel: x={sid_x1}..{sid_x2}, y={bubble_y1}..{bubble_y2}")
    
    print(f"variant_code:")
    print(f'  "x_left": {tid_x1/w:.3f},  "x_right": {tid_x2/w:.3f}')
    print(f'  "y_top": {bubble_y1/h:.3f},  "y_bottom": {bubble_y2/h:.3f}')
    print(f"  → pixel: x={tid_x1}..{tid_x2}, y={bubble_y1}..{bubble_y2}")
