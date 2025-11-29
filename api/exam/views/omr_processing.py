from exam.models import PaperSubmission, PaperAnswerDetected
import os
from django.db import transaction
import cv2
import cloudinary
import cloudinary.uploader
import tempfile

def process_submission(submission_id):
    submission = PaperSubmission.objects.get(id=submission_id)
    test = submission.test
    image_path = submission.submission_image.path
    
    # Process the OMR sheet
    answers_with_positions, paper, question_contours = process_omr_sheet(image_path, test)
    
    correct_answers = 0
    total_questions = test.questions.count()
    
    # Define the answer key (mapping question index to correct answer index: 0=A, 1=B, 2=C, 3=D)
    question_ids = list(test.questions.values_list('id', flat=True))
    ANSWER_KEY = {i: {'A': 0, 'B': 1, 'C': 2, 'D': 3}[test.questions.all()[i].correct_answer] 
                  for i in range(total_questions)}
    
    for question_id, (user_answer, user_position, contours) in answers_with_positions.items():
        if not user_answer or user_answer.strip() == "":
            is_correct = False
        else:
            # Convert user_answer to index (e.g., 'A' -> 0, 'B' -> 1, etc.)
            choice_letters = ['A', 'B', 'C', 'D'][:test.num_choices]
            try:
                user_answer_idx = choice_letters.index(user_answer[0])  # Take first letter
                question_index = question_ids.index(question_id)
                correct_answer_idx = ANSWER_KEY[question_index]
                is_correct = user_answer_idx == correct_answer_idx
            except (ValueError, KeyError, IndexError):
                is_correct = False
        
        # Count correct answers
        if is_correct:
            correct_answers += 1
        
        # Save answer detection result
        PaperAnswerDetected.objects.create(
            submission=submission,
            question=test.questions.get(id=question_id),
            is_correct=is_correct,
            score=1 if is_correct else 0,
            confidence=0.9
        )
        
        # Draw on image using cv2.drawContours (similar to the provided example)
        if user_answer and user_answer.strip() != "":
            # Default color is red (incorrect)
            color = (0, 0, 255)
            k = ANSWER_KEY[question_index]  # Correct answer index
            if k == user_answer_idx:  # If the bubbled answer is correct
                color = (0, 255, 0)  # Green for correct
            # Draw the contour of the correct answer
            cv2.drawContours(paper, [contours[k]], -1, color, 3)

    # Calculate score
    total_score = (correct_answers / total_questions) * 10 if total_questions > 0 else 0
    total_score = round(total_score, 2)
    
    # Display total score on the image using OpenCV
    score_text = f"TOTAL SCORE: {total_score}/10"
    cv2.putText(paper, score_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
    
    # Save the image using OpenCV
    cv2.imwrite(image_path, paper)
    
    # Update the submission
    with transaction.atomic():
        submission.total_score = total_score
        submission.save()
        
def process_submission_cloudinary(submission_id, image_url):
    """
    Process submission với image từ Cloudinary
    """
    import requests
    
    submission = PaperSubmission.objects.get(id=submission_id)
    test = submission.test
    
    # Download image từ Cloudinary về temporary file
    try:
        response = requests.get(image_url)
        response.raise_for_status()
        
        # Tạo temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp_file:
            tmp_file.write(response.content)
            tmp_image_path = tmp_file.name
        
        # Process OMR sheet
        answers_with_positions, paper, question_contours = process_omr_sheet(tmp_image_path, test)
        
        correct_answers = 0
        total_questions = test.questions.count()
        
        # Define answer key
        question_ids = list(test.questions.values_list('id', flat=True))
        ANSWER_KEY = {
            i: {'A': 0, 'B': 1, 'C': 2, 'D': 3}[test.questions.all()[i].correct_answer] 
            for i in range(total_questions)
        }
        
        # Process answers
        for question_id, (user_answer, user_position, contours) in answers_with_positions.items():
            if not user_answer or user_answer.strip() == "":
                is_correct = False
            else:
                choice_letters = ['A', 'B', 'C', 'D'][:test.num_choices]
                try:
                    user_answer_idx = choice_letters.index(user_answer[0])
                    question_index = question_ids.index(question_id)
                    correct_answer_idx = ANSWER_KEY[question_index]
                    is_correct = user_answer_idx == correct_answer_idx
                except (ValueError, KeyError, IndexError):
                    is_correct = False
            
            if is_correct:
                correct_answers += 1
            
            PaperAnswerDetected.objects.create(
                submission=submission,
                question=test.questions.get(id=question_id),
                is_correct=is_correct,
                score=1 if is_correct else 0,
                confidence=0.9
            )
            
            # Draw on image
            if user_answer and user_answer.strip() != "":
                color = (0, 0, 255)
                k = ANSWER_KEY[question_index]
                if k == user_answer_idx:
                    color = (0, 255, 0)
                cv2.drawContours(paper, [contours[k]], -1, color, 3)
        
        # Calculate score
        total_score = (correct_answers / total_questions) * 10 if total_questions > 0 else 0
        total_score = round(total_score, 2)
        
        # Add score text
        score_text = f"TOTAL SCORE: {total_score}/10"
        cv2.putText(paper, score_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        
        # Save processed image
        cv2.imwrite(tmp_image_path, paper)
        
        # Upload processed image back to Cloudinary
        processed_upload = cloudinary.uploader.upload(
            tmp_image_path,
            folder=f"testgen/submissions/test_{test.id}",
            public_id=f"processed_submission_{submission.id}",
            resource_type="image",
            overwrite=True
        )
        
        # Update submission with processed image URL and score
        with transaction.atomic():
            submission.submission_image = processed_upload['secure_url']
            submission.total_score = total_score
            submission.save()
        
        # Clean up temporary file
        os.unlink(tmp_image_path)
        
    except Exception as e:
        print(f"Error processing submission: {e}")
        # Có thể log error hoặc update submission status
        with transaction.atomic():
            submission.total_score = 0
            submission.save()

def process_omr_sheet(image_path, test):
    import cv2
    import numpy as np
    from imutils import contours
    import imutils
    from imutils.perspective import four_point_transform

    # Load image
    image = cv2.imread(image_path)
    if image is None:
        raise Exception(f"Không thể đọc ảnh từ đường dẫn: {image_path}")

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (7, 7), 0)
    edged = cv2.Canny(blurred, 75, 200)
    cv2.imwrite("debug_edged.jpg", edged)
    
    cnts = cv2.findContours(edged.copy(), cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE)    
    cnts = imutils.grab_contours(cnts)
    cnts = sorted(cnts, key=cv2.contourArea, reverse=True)[:5]
    docCnt = None
    if len(cnts) > 0:
        # sort the contours according to their size in
        # descending order
        cnts = sorted(cnts, key=cv2.contourArea, reverse=True)
        # loop over the sorted contours
        for c in cnts:
            # approximate the contour
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            print(f"Đã phát hiện contour với {len(approx)} điểm")
            # if our approximated contour has four points,
            # then we can assume we have found the paper
            if len(approx) == 4:
                docCnt = approx
                print("Found document contour")
                break

    if docCnt is None:
        raise Exception("Không tìm thấy contour có 4 điểm (tờ giấy)")

    # Vẽ contour lên ảnh gốc (màu xanh lá cây, độ dày 2 pixel)
    output = image.copy()
    cv2.drawContours(output, [docCnt], -1, (0, 255, 0), 2)
    # Lưu ảnh để debug
    cv2.imwrite("debug_detected_paper.jpg", output)
    print("Ảnh đã được lưu dưới tên debug_detected_paper.jpg")

    paper = four_point_transform(image, docCnt.reshape(4, 2))
    warped = four_point_transform(gray, docCnt.reshape(4, 2))
    thresh = cv2.threshold(warped, 0, 255,
        cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)[1]
    cv2.imwrite("debug_thresh.jpg", thresh)
    
    # Find question contours
    cnts = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnts = imutils.grab_contours(cnts)
    questionCnts = []
    y_min = 110  # Giới hạn trên (bỏ qua phần tiêu đề)
    y_max = 800  # Giới hạn dưới (tùy theo chiều dài bài thi của bạn)
    for c in cnts:
        (x, y, w, h) = cv2.boundingRect(c)
        ar = w / float(h)
        if w >= 8 and h >= 8 and ar >= 0.4 and ar <= 1.6:
            if y_min <= y <= y_max:
                questionCnts.append(c)

        # Debug: Vẽ tất cả các ô đã phát hiện
    output = warped.copy()  # Tạo bản sao từ ảnh scan xám
    output = cv2.cvtColor(output, cv2.COLOR_GRAY2BGR)  # Chuyển sang ảnh màu để vẽ màu

    for c in questionCnts:
        cv2.drawContours(output, [c], -1, (0, 0, 255), 2)  # Vẽ contour màu đỏ

    # Lưu ảnh debug
    cv2.imwrite("debug_detected_bubbles.jpg", output)
    print(f"Đã lưu ảnh debug_detected_bubbles.jpg với {len(questionCnts)} ô được phát hiện!")

    # Sort contours and detect answers
    questionCnts = contours.sort_contours(questionCnts, method="top-to-bottom")[0]
    answers = {}
    question_contours = {}  # To store contours for each question

    # Get the list of question IDs in order
    question_ids = list(test.questions.values_list('id', flat=True))

    for (q, i) in enumerate(np.arange(0, len(questionCnts), test.num_choices)):
        if q >= test.questions.count():
            break
        cnts = contours.sort_contours(questionCnts[i:i + test.num_choices])[0]
        bubbled = None
        for (j, c) in enumerate(cnts):
            mask = np.zeros(thresh.shape, dtype="uint8")
            cv2.drawContours(mask, [c], -1, 255, -1)
            mask = cv2.bitwise_and(thresh, thresh, mask=mask)
            total = cv2.countNonZero(mask)
            if bubbled is None or total > bubbled[0]:
                bubbled = (total, j)
        
        if bubbled:
            choice_letters = ['A', 'B', 'C', 'D'][:test.num_choices]
            user_answer = choice_letters[bubbled[1]] if bubbled[1] < len(choice_letters) else ""
            (x, y, w, h) = cv2.boundingRect(cnts[bubbled[1]])
            rect = (x, y, x + w, y + h)
            current_question_id = question_ids[q]
            answers[current_question_id] = (user_answer, rect, cnts)  # Include contours
            question_contours[current_question_id] = cnts

    return answers, paper, question_contours
