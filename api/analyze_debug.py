import cv2
import numpy as np

def analyze_image(path, label):
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        print(f"{label}: NOT FOUND at {path}")
        return
    h, w = img.shape
    print(f"\n=== {label} ===")
    print(f"Size: {w}x{h} (WxH)")
    
    # Row sums
    row_sums = np.sum(img > 128, axis=1)
    active_rows = np.where(row_sums > 5)[0]
    if len(active_rows):
        print(f"Active rows (Y): {active_rows[0]} to {active_rows[-1]}")
    
    # Col sums
    col_sums = np.sum(img > 128, axis=0)
    active_cols = np.where(col_sums > 3)[0]
    if len(active_cols):
        print(f"Active cols (X): {active_cols[0]} to {active_cols[-1]}")
    
    # Find gaps in column activity to detect column separators
    if len(active_cols) > 1:
        gaps = []
        for i in range(1, len(active_cols)):
            if active_cols[i] - active_cols[i-1] > 8:
                gaps.append((active_cols[i-1], active_cols[i]))
        if gaps:
            print(f"Column gaps (separators): {gaps}")
    
    # Find Y position of large white blobs (filled bubbles)
    _, binary = cv2.threshold(img, 128, 255, cv2.THRESH_BINARY)
    cnts, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    large_blobs = []
    for c in cnts:
        area = cv2.contourArea(c)
        (x, y, bw, bh) = cv2.boundingRect(c)
        if area > 100 and bw/max(bh,1) < 3:  # not a wide rectangle
            large_blobs.append((x, y, bw, bh, area))
    large_blobs.sort(key=lambda b: (b[0], b[1]))
    print(f"Large circular blobs (x,y,w,h,area):")
    for b in large_blobs[:20]:
        print(f"  x={b[0]:3d} y={b[1]:3d} w={b[2]:2d} h={b[3]:2d} area={b[4]:.0f}")

analyze_image(r'd:\TestGen\testgen\api\debug_student_id_region.jpg', 'STUDENT ID REGION')
analyze_image(r'd:\TestGen\testgen\api\debug_variant_region.jpg', 'VARIANT REGION')
analyze_image(r'd:\TestGen\testgen\api\debug_thresh.jpg', 'THRESH (full warped)')
