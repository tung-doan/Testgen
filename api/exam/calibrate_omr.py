# testgen/api/exam/calibrate_omr.py

import cv2
import numpy as np
from imutils import contours
import imutils
from imutils.perspective import four_point_transform
import sys
import os

def calibrate_omr(image_path, test_name="calibration"):
    """
    Script để visualize và điều chỉnh tham số OMR
    
    Usage:
        python manage.py shell
        >>> from exam.calibrate_omr import calibrate_omr
        >>> calibrate_omr('path/to/test_image.jpg')
    """
    
 # STEP 1: LOAD IMAGE
    image = cv2.imread(image_path)
    if image is None:
        print(f" Cannot read image: {image_path}")
        return
    
    print(f" Image loaded: {image.shape}")
    
 # Create output directory
    output_dir = f"debug_calibration_{test_name}"
    os.makedirs(output_dir, exist_ok=True)
    
    
 # STEP 2: PREPROCESSING
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (7, 7), 0)
    edged = cv2.Canny(blurred, 75, 200)
    
    cv2.imwrite(f"{output_dir}/01_edged.jpg", edged)
    print(f" Saved: {output_dir}/01_edged.jpg")
    
    
 # STEP 3: FIND PAPER CONTOUR
    cnts = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:5]
    
    docCnt = None
    for c in cnts:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4:
            docCnt = approx
            break
    
    if docCnt is None:
        print(" Cannot find paper contour")
        return
    
 # Draw paper contour
    output = image.copy()
    cv2.drawContours(output, [docCnt], -1, (0, 255, 0), 3)
    cv2.imwrite(f"{output_dir}/02_paper_detected.jpg", output)
    print(f" Paper detected: {output_dir}/02_paper_detected.jpg")
    
    
 # STEP 4: PERSPECTIVE TRANSFORM
    paper = four_point_transform(image, docCnt.reshape(4, 2))
    warped = four_point_transform(gray, docCnt.reshape(4, 2))
    thresh = cv2.threshold(warped, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]
    
    cv2.imwrite(f"{output_dir}/03_warped.jpg", warped)
    cv2.imwrite(f"{output_dir}/04_thresh.jpg", thresh)
    print(f" Warped size: {warped.shape}")
    
    
 # STEP 5: DETECT VARIANT CODE REGION
 # ️ ĐIỀU CHỈNH TẠI ĐÂY
    variant_y_min = 100
    variant_y_max = 250
    variant_x_min = 50
    variant_x_max = 250
    
    variant_region = thresh[variant_y_min:variant_y_max, variant_x_min:variant_x_max]
    cv2.imwrite(f"{output_dir}/05_variant_region.jpg", variant_region)
    print(f" Variant region cropped: Y={variant_y_min}-{variant_y_max}, X={variant_x_min}-{variant_x_max}")
    
 # Draw variant region on warped
    output_variant = cv2.cvtColor(warped, cv2.COLOR_GRAY2BGR)
    cv2.rectangle(output_variant, 
                  (variant_x_min, variant_y_min), 
                  (variant_x_max, variant_y_max), 
                  (0, 255, 0), 2)
    cv2.putText(output_variant, "VARIANT REGION", 
                (variant_x_min, variant_y_min - 10), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
    cv2.imwrite(f"{output_dir}/05b_variant_region_marked.jpg", output_variant)
    
    
 # STEP 6: DETECT VARIANT BUBBLES
    cnts = cv2.findContours(variant_region.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)
    
 # ️ ĐIỀU CHỈNH ASPECT RATIO VÀ SIZE TẠI ĐÂY
    min_bubble_size = 5
    max_bubble_size = 50
    aspect_ratio_min = 0.7
    aspect_ratio_max = 1.3
    
    variant_bubbles = []
    for c in cnts:
        (x, y, w, h) = cv2.boundingRect(c)
        ar = w / float(h)
        if min_bubble_size <= w <= max_bubble_size and min_bubble_size <= h <= max_bubble_size:
            if aspect_ratio_min <= ar <= aspect_ratio_max:
                variant_bubbles.append((y, c, x, w, h, ar))
    
    print(f" Detected {len(variant_bubbles)} variant bubbles")
    
 # Draw all detected bubbles
    output_bubbles = cv2.cvtColor(variant_region, cv2.COLOR_GRAY2BGR)
    for (y, bubble, x, w, h, ar) in variant_bubbles:
        cv2.drawContours(output_bubbles, [bubble], -1, (0, 0, 255), 2)
        cv2.putText(output_bubbles, f"{ar:.2f}", (x, y - 5), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 0, 0), 1)
    cv2.imwrite(f"{output_dir}/06_variant_bubbles.jpg", output_bubbles)
    
    
 # STEP 7: DETECT 3 COLUMNS
 # ️ ĐIỀU CHỈNH COLUMN WIDTH TẠI ĐÂY
    column_width = 60
    
    for digit_index in range(3):
        x_start = digit_index * column_width
        x_end = x_start + 50
        
        digit_region = variant_region[:, x_start:x_end]
        
 # Find bubbles in this column
        cnts = cv2.findContours(digit_region.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cnts = imutils.grab_contours(cnts)
        
        digit_bubbles = []
        for c in cnts:
            (x, y, w, h) = cv2.boundingRect(c)
            ar = w / float(h)
            if min_bubble_size <= w <= max_bubble_size and min_bubble_size <= h <= max_bubble_size:
                if aspect_ratio_min <= ar <= aspect_ratio_max:
                    digit_bubbles.append((y, c))
        
        digit_bubbles = sorted(digit_bubbles, key=lambda b: b[0])
        
        print(f"  Column {digit_index + 1}: {len(digit_bubbles)} bubbles")
        
 # Draw column boundaries
        output_columns = cv2.cvtColor(digit_region, cv2.COLOR_GRAY2BGR)
        for idx, (y, bubble) in enumerate(digit_bubbles):
            cv2.drawContours(output_columns, [bubble], -1, (0, 255, 0), 2)
            cv2.putText(output_columns, str(idx), 
                        (5, y + 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 0, 0), 1)
        cv2.imwrite(f"{output_dir}/07_column_{digit_index+1}.jpg", output_columns)
    
    
 # STEP 8: DETECT QUESTION BUBBLES
 # ️ ĐIỀU CHỈNH Y RANGE TẠI ĐÂY
    question_y_min = 250
    question_y_max = warped.shape[0] - 100
    
    cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)
    
 # ️ ĐIỀU CHỈNH BUBBLE CRITERIA TẠI ĐÂY
    question_min_size = 8
    question_aspect_min = 0.4
    question_aspect_max = 1.6
    
    questionCnts = []
    for c in cnts:
        (x, y, w, h) = cv2.boundingRect(c)
        ar = w / float(h)
        if w >= question_min_size and h >= question_min_size:
            if question_aspect_min <= ar <= question_aspect_max:
                if question_y_min <= y <= question_y_max:
                    questionCnts.append(c)
    
    print(f" Detected {len(questionCnts)} question bubbles")
    
 # Draw question region
    output_questions = cv2.cvtColor(warped, cv2.COLOR_GRAY2BGR)
    cv2.rectangle(output_questions, 
                  (0, question_y_min), 
                  (warped.shape[1], question_y_max), 
                  (255, 0, 0), 2)
    cv2.putText(output_questions, "QUESTION REGION", 
                (10, question_y_min - 10), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)
    
    for c in questionCnts:
        cv2.drawContours(output_questions, [c], -1, (0, 0, 255), 2)
    
    cv2.imwrite(f"{output_dir}/08_question_bubbles.jpg", output_questions)
    
    
 # STEP 9: ANALYZE FILLED BUBBLES
 # ️ ĐIỀU CHỈNH THRESHOLD TẠI ĐÂY
    filled_threshold = 100
    
    questionCnts = contours.sort_contours(questionCnts, method="top-to-bottom")[0]
    
    filled_counts = []
    for c in questionCnts[:20]:  # Test first 20 bubbles
        mask = np.zeros(thresh.shape, dtype="uint8")
        cv2.drawContours(mask, [c], -1, 255, -1)
        mask = cv2.bitwise_and(thresh, thresh, mask=mask)
        total = cv2.countNonZero(mask)
        filled_counts.append(total)
    
    if filled_counts:
        print(f"\n Filled Bubble Analysis (first 20):")
        print(f"  Min: {min(filled_counts)}")
        print(f"  Max: {max(filled_counts)}")
        print(f"  Mean: {np.mean(filled_counts):.2f}")
        print(f"  Median: {np.median(filled_counts):.2f}")
        print(f"  Current threshold: {filled_threshold}")
        print(f"  ️ Filled bubbles should be > {filled_threshold}")
        print(f"  ️ Empty bubbles should be < {filled_threshold}")
    
    
 # SUMMARY
    print(f"\n" + "="*60)
    print(f" CALIBRATION SUMMARY")
    print(f"="*60)
    print(f" All debug images saved to: {output_dir}/")
    print(f"\n CURRENT PARAMETERS:")
    print(f"  Variant Region:")
    print(f"    Y: {variant_y_min}-{variant_y_max}")
    print(f"    X: {variant_x_min}-{variant_x_max}")
    print(f"  Variant Bubbles:")
    print(f"    Size: {min_bubble_size}-{max_bubble_size}px")
    print(f"    Aspect Ratio: {aspect_ratio_min}-{aspect_ratio_max}")
    print(f"    Column Width: {column_width}px")
    print(f"  Question Bubbles:")
    print(f"    Y Range: {question_y_min}-{question_y_max}")
    print(f"    Min Size: {question_min_size}px")
    print(f"    Aspect Ratio: {question_aspect_min}-{question_aspect_max}")
    print(f"    Filled Threshold: {filled_threshold}")
    print(f"\n HOW TO ADJUST:")
    print(f"  1. Open images in {output_dir}/")
    print(f"  2. Check 05b_variant_region_marked.jpg - variant region correct?")
    print(f"  3. Check 06_variant_bubbles.jpg - all 30 bubbles detected?")
    print(f"  4. Check 07_column_*.jpg - 10 bubbles per column?")
    print(f"  5. Check 08_question_bubbles.jpg - all answer bubbles detected?")
    print(f"  6. Adjust parameters in calibrate_omr.py and re-run")
    print(f"="*60)
    
    return output_dir


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python calibrate_omr.py <image_path>")
        sys.exit(1)
    
    calibrate_omr(sys.argv[1])