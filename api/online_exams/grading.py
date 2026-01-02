from question_bank.models import Question, AnswerOption

def grade_question(question, student_answer, max_points):
    """
    Chấm điểm một câu hỏi dựa trên loại câu hỏi và đáp án
    
    Args:
        question: Question object
        student_answer: dict - Dữ liệu trả lời của sinh viên
        max_points: float - Điểm tối đa cho câu này
        
    Returns:
        float - Điểm đạt được
    """
    
    if question.question_type == 'MC':  # Multiple Choice
        return grade_multiple_choice(question, student_answer, max_points)
    
    elif question.question_type == 'TFE':  # True/False Extended
        return grade_true_false(question, student_answer, max_points)
    
    elif question.question_type == 'ORD':  # Ordering
        return grade_ordering(question, student_answer, max_points)
    
    elif question.question_type == 'FIB':  # Fill in the Blank
        return grade_fill_blank(question, student_answer, max_points)
    
    return 0.0

def grade_multiple_choice(question, student_answer, max_points):
    """
    Chấm điểm Multiple Choice
    student_answer format: {'selected_options': [1, 3]}
    """
    selected_ids = set(student_answer.get('selected_options', []))
    
    if not selected_ids:
        return 0.0
    
    # Lấy tất cả đáp án đúng (is_correct_bool = True)
    correct_options = set(
        question.options.filter(is_correct_bool=True).values_list('id', flat=True)
    )
    
    #Phải chọn đúng hết, không thừa không thiếu
    if selected_ids == correct_options:
        return max_points
    else:
        return 0.0

def grade_true_false(question, student_answer, max_points):
    """
    Chấm điểm True/False Extended
    student_answer format: {'responses': [true, false, true, true]}
    """
    responses = student_answer.get('responses', [])
    
    if not responses:
        return 0.0
    
    options = question.options.all().order_by('order')
    
    if len(responses) != options.count():
        return 0.0

    all_correct = all(
        response == option.is_correct_bool 
        for response, option in zip(responses, options)
    )
    
    return max_points if all_correct else 0.0

def grade_ordering(question, student_answer, max_points):
    """
    Chấm điểm Ordering
    student_answer format: {'order': [3, 1, 4, 2]}
    """
    student_order = student_answer.get('order', [])
    
    if not student_order:
        return 0.0
    
    # Lấy thứ tự đúng
    correct_order = list(
        question.options.order_by('correct_order').values_list('id', flat=True)
    )
    
    if student_order == correct_order:
        return max_points
    else:
        return 0.0

def grade_fill_blank(question, student_answer, max_points):
    if not student_answer or 'text' not in student_answer or not student_answer['text']:
        return 0.0

    student_text = student_answer['text'].strip().lower()

    if not question.correct_answer_text:
        return 0.0
    correct_list = [
        ans.strip().lower() 
        for ans in question.correct_answer_text.split(',') 
        if ans.strip()
    ]
    if student_text in correct_list:
        return max_points
    
    return 0.0

def convert_to_scale_10(raw_score, total_max_score):
    if total_max_score == 0:
        return 0.0
    
    scaled_score = (raw_score / total_max_score) * 10.0
    return round(scaled_score, 2)