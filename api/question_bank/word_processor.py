"""
Utility functions for processing Word documents containing questions
Supports both English and Vietnamese formats
"""
import docx
import re
import hashlib
from question_bank.models import Question, AnswerOption


def normalize_text(text):
    """Normalize text for comparison: lowercase, collapse whitespace."""
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text.strip().lower())


def compute_fingerprint(prompt, options_texts):
    """
    Compute MD5 fingerprint from prompt + sorted options.
    This allows O(1) duplicate detection via set lookup.
    """
    normalized_prompt = normalize_text(prompt)
    normalized_options = sorted([normalize_text(t) for t in options_texts])
    raw = f"{normalized_prompt}|{'|'.join(normalized_options)}"
    return hashlib.md5(raw.encode('utf-8')).hexdigest()

class WordQuestionParser:
    """
    Parser for Word documents containing questions.
    
    Supported formats:
    
    === ENGLISH FORMAT ===
    
    1. Multiple Choice:
    Question 1: What is the capital of Vietnam?
    A. Hanoi
    B. Ho Chi Minh City
    C. Da Nang
    D. Hai Phong
    ANSWER: A
    
    OR with multiple correct answers:
    Question 2: Which are prime numbers?
    A. 2
    B. 3
    C. 4
    D. 5
    ANSWER: A, B, D
    
    2. True/False Extended:
    Question 3: Evaluate the following statements as True or False:
    1. The sun rises in the East
    2. The Earth is square
    3. Water boils at 100°C
    4. Humans have 4 legs
    ANSWER: 1-T, 2-F, 3-T, 4-F
    
    3. Ordering:
    Question 4: Arrange the seasons in order:
    A. Autumn
    B. Spring
    C. Summer
    D. Winter
    CORRECT ORDER: B, C, A, D
    
    4. Fill in the Blank:
    Question 5: The capital of France is _____?
    ANSWER: Paris
    
    === VIETNAMESE FORMAT ===
    (Original format as before)
    """
    
    # English patterns
    QUESTION_PATTERN_EN = re.compile(r'^Question\s+(\d+):\s*(.+)$', re.IGNORECASE)
    ANSWER_PATTERN_EN = re.compile(r'^ANSWER:\s*(.+)$', re.IGNORECASE)
    ORDER_PATTERN_EN = re.compile(r'^CORRECT\s*ORDER:\s*(.+)$', re.IGNORECASE)
    
    # Vietnamese patterns
    QUESTION_PATTERN_VI = re.compile(r'^Câu\s+(\d+):\s*(.+)$', re.IGNORECASE)
    ANSWER_PATTERN_VI = re.compile(r'^ĐÁP\s*ÁN:\s*(.+)$', re.IGNORECASE)
    ORDER_PATTERN_VI = re.compile(r'^THỨ\s*TỰ\s*ĐÚNG:\s*(.+)$', re.IGNORECASE)
    
    # Common patterns
    OPTION_PATTERN = re.compile(r'^([A-Z])\.\s*(.+)$')
    NUMBERED_OPTION_PATTERN = re.compile(r'^(\d+)\.\s*(.+)$')
    
    # Keywords for question type detection
    ORDERING_KEYWORDS_EN = ['arrange', 'order', 'sequence', 'sort']
    ORDERING_KEYWORDS_VI = ['sắp xếp', 'thứ tự']
    
    TRUE_FALSE_KEYWORDS_EN = ['true/false', 'true or false', 'evaluate', 't/f']
    TRUE_FALSE_KEYWORDS_VI = ['đúng/sai', 'đánh giá']
    
    @staticmethod
    def detect_language(text):
        """Detect if document is in English or Vietnamese"""
        vietnamese_chars = set('àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ')
        vietnamese_count = sum(1 for char in text.lower() if char in vietnamese_chars)
        
        # If more than 5% of characters are Vietnamese-specific, consider it Vietnamese
        return 'vi' if vietnamese_count > len(text) * 0.05 else 'en'
    
    @staticmethod
    def detect_question_type(prompt, options, answer=None, order=None, language='en'):
        """Detect question type based on content and answer structure."""
        if not options:
            return Question.QuestionType.FILL_IN_BLANK

        prompt_lower = prompt.lower()

        # Ordering takes precedence when there is an explicit ordering answer.
        if order:
            return Question.QuestionType.ORDERING

        # Structural TF detection: numbered statements and answers like "1-T, 2-F".
        has_numbered_options = any("number" in opt for opt in options)
        tf_answer_pattern = re.compile(
            r'^\s*\d+\s*-\s*(?:T|F|TRUE|FALSE|Y|N|YES|NO|Đ|S|ĐÚNG|SAI)(?:\s*,\s*\d+\s*-\s*(?:T|F|TRUE|FALSE|Y|N|YES|NO|Đ|S|ĐÚNG|SAI))*\s*$',
            re.IGNORECASE
        )
        has_tf_answer_format = bool(answer and tf_answer_pattern.match(answer.strip()))
        if has_numbered_options and has_tf_answer_format:
            return Question.QuestionType.TRUE_FALSE_EXTENDED

        # Check for ordering by prompt keywords.
        ordering_keywords = (
            WordQuestionParser.ORDERING_KEYWORDS_EN
            if language == 'en' else WordQuestionParser.ORDERING_KEYWORDS_VI
        )
        if any(keyword in prompt_lower for keyword in ordering_keywords):
            return Question.QuestionType.ORDERING

        # Check for true/false by prompt keywords.
        tf_keywords = (
            WordQuestionParser.TRUE_FALSE_KEYWORDS_EN
            if language == 'en' else WordQuestionParser.TRUE_FALSE_KEYWORDS_VI
        )
        if any(keyword in prompt_lower for keyword in tf_keywords):
            return Question.QuestionType.TRUE_FALSE_EXTENDED

        return Question.QuestionType.MULTIPLE_CHOICE
    
    @staticmethod
    def parse_document(file_path):
        """
        Parse Word document and extract questions
        Auto-detects language (English or Vietnamese)
        Returns: List of question dictionaries
        """
        doc = docx.Document(file_path)
        
        # Detect language from first few paragraphs
        sample_text = ' '.join([p.text for p in doc.paragraphs[:5]])
        language = WordQuestionParser.detect_language(sample_text)
        
        print(f"[Parser] Detected language: {language}")
        
        # Select patterns based on language
        if language == 'en':
            question_pattern = WordQuestionParser.QUESTION_PATTERN_EN
            answer_pattern = WordQuestionParser.ANSWER_PATTERN_EN
            order_pattern = WordQuestionParser.ORDER_PATTERN_EN
        else:
            question_pattern = WordQuestionParser.QUESTION_PATTERN_VI
            answer_pattern = WordQuestionParser.ANSWER_PATTERN_VI
            order_pattern = WordQuestionParser.ORDER_PATTERN_VI
        
        questions_data = []
        current_question = None
        current_options = []
        current_answer = None
        current_order = None
        
        all_lines = []
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            # Split by newline in case paragraph contains multiple lines
            lines = text.split('\n')
            all_lines.extend([line.strip() for line in lines if line.strip()])
        
        print(f"[Parser] Total lines to process: {len(all_lines)}")
        
        for text in all_lines:
            if not text:
                continue
            
            print(f"[Parser] Processing line: '{text}'")
            
            # Check for question start
            question_match = question_pattern.match(text)
            if question_match:
                # Save previous question if exists
                if current_question:
                    print(f"[Parser] Saving previous question: {current_question['prompt'][:50]}...")
                    questions_data.append(
                        WordQuestionParser._build_question_data(
                            current_question, current_options, 
                            current_answer, current_order, language
                        )
                    )
                
                # Start new question
                question_num = question_match.group(1)
                question_text = question_match.group(2)
                current_question = {
                    "number": int(question_num),
                    "prompt": question_text.strip()
                }
                current_options = []
                current_answer = None
                current_order = None
                print(f"[Parser] Started question {question_num}: {question_text}")
                continue
            
            # Check for options (A, B, C, D...)
            option_match = WordQuestionParser.OPTION_PATTERN.match(text)
            if option_match and current_question:
                letter = option_match.group(1)
                option_text = option_match.group(2)
                current_options.append({
                    "letter": letter,
                    "text": option_text.strip(),
                    "order": len(current_options)
                })
                print(f"[Parser] Added option {letter}: {option_text}")
                continue
            
            # Check for numbered options (1, 2, 3, 4 for True/False)
            numbered_match = WordQuestionParser.NUMBERED_OPTION_PATTERN.match(text)
            if numbered_match and current_question:
                number = numbered_match.group(1)
                option_text = numbered_match.group(2)
                current_options.append({
                    "number": int(number),
                    "text": option_text.strip(),
                    "order": len(current_options)
                })
                print(f"[Parser] Added numbered option {number}: {option_text}")
                continue
            
            # Check for answer
            answer_match = answer_pattern.match(text)
            if answer_match:
                current_answer = answer_match.group(1).strip()
                print(f"[Parser] Found answer: {current_answer}")
                continue
            
            # Check for ordering answer
            order_match = order_pattern.match(text)
            if order_match:
                current_order = order_match.group(1).strip()
                print(f"[Parser] Found order: {current_order}")
                continue
        
        # Save last question
        if current_question:
            print(f"[Parser] Saving last question: {current_question['prompt'][:50]}...")
            questions_data.append(
                WordQuestionParser._build_question_data(
                    current_question, current_options, 
                    current_answer, current_order, language
                )
            )
        
        print(f"[Parser] Total questions parsed: {len(questions_data)}")
        return questions_data
    
    @staticmethod
    def _build_question_data(question_info, options, answer, order, language='en'):
        """Build complete question data structure"""
        question_type = WordQuestionParser.detect_question_type(
            question_info["prompt"], options, answer=answer, order=order, language=language
        )
        
        print(f"[Parser] Building question data. Type: {question_type}, Options count: {len(options)}, Answer: {answer}")
        
        result = {
            "question": {
                "prompt": question_info["prompt"],
                "question_type": question_type,
                "points": 1.0,
                "correct_answer_text": None  # ✅ Add this field
            },
            "options": []
        }
        
        if question_type == Question.QuestionType.FILL_IN_BLANK:
            # For fill blank, store answer in correct_answer_text
            if answer:
                # Tách các đáp án bằng dấu phẩy, loại bỏ khoảng trắng và các phần tử rỗng
                answer_list = [a.strip() for a in answer.split(',') if a.strip()]
                # Lưu lại dưới dạng chuỗi ngăn cách bởi dấu phẩy chuẩn: "Hanoi, Hà Nội"
                result["question"]["correct_answer_text"] = ", ".join(answer_list)
            else:
                result["question"]["correct_answer_text"] = ""
            
            print(f"[Parser] Fill in blank question, answers parsed: {result['question']['correct_answer_text']}")
            # No options needed for fill in blank
        
        elif question_type == Question.QuestionType.TRUE_FALSE_EXTENDED:
            # Parse answer like "1-T, 2-F, 3-T, 4-F" (English) or "1-Đ, 2-S, 3-Đ, 4-Đ" (Vietnamese)
            answer_map = WordQuestionParser._parse_true_false_answer(answer, language)
            for opt in options:
                opt_number = opt.get("number")
                is_correct = answer_map.get(opt_number, False)
                result["options"].append({
                    "text": opt["text"],
                    "is_correct_bool": is_correct,  # Use is_correct_bool for TFE
                    "correct_order": None,
                    "order": opt["order"]
                })
        
        elif question_type == Question.QuestionType.ORDERING:
            # Parse order like "B, C, A, D"
            correct_order = WordQuestionParser._parse_ordering_answer(order or answer)
            for opt in options:
                letter = opt.get("letter")
                correct_position = correct_order.index(letter) if letter in correct_order else -1
                result["options"].append({
                    "text": opt["text"],
                    "is_correct_bool": False,
                    "correct_order": correct_position + 1 if correct_position >= 0 else None,
                    "order": opt["order"]
                })
        
        else:  # MULTIPLE_CHOICE
            # Parse answer like "A" or "A, C" for multiple correct
            correct_letters = WordQuestionParser._parse_multiple_choice_answer(answer)
            score_per_correct = 100.0 / len(correct_letters) if correct_letters else 0
            
            print(f"[Parser] Multiple choice. Correct answers: {correct_letters}")
            
            for opt in options:
                letter = opt.get("letter")
                is_correct = letter in correct_letters
                result["options"].append({
                    "text": opt["text"],
                    "is_correct_bool": is_correct,
                    "correct_order": None,
                    "order": opt["order"]
                })
        
        return result
    
    @staticmethod
    def _parse_true_false_answer(answer, language='en'):
        """Parse True/False answer string"""
        answer_map = {}
        if not answer:
            return answer_map
        
        # Format: "1-T, 2-F, 3-T, 4-F" (English) or "1-Đ, 2-S, 3-Đ, 4-Đ" (Vietnamese)
        parts = [p.strip() for p in answer.split(',')]
        
        for part in parts:
            if '-' in part:
                num_str, tf = part.split('-')
                num = int(num_str.strip())
                
                tf_upper = tf.strip().upper()
                
                if language == 'en':
                    # English: T/TRUE or F/FALSE
                    is_true = tf_upper in ['T', 'TRUE', 'YES', 'Y']
                else:
                    # Vietnamese: Đ/ĐÚNG or S/SAI
                    is_true = tf_upper in ['Đ', 'ĐÚNG', 'T', 'TRUE']
                
                answer_map[num] = is_true
        
        return answer_map
    
    @staticmethod
    def _parse_ordering_answer(order_str):
        """Parse ordering answer string"""
        if not order_str:
            return []
        # Format: "B, C, A, D" or "B,C,A,D"
        return [letter.strip().upper() for letter in order_str.split(',')]
    
    @staticmethod
    def _parse_multiple_choice_answer(answer):
        """Parse multiple choice answer string"""
        if not answer:
            return []
        # Format: "A" or "A, C" or "A,C"
        return [letter.strip().upper() for letter in answer.split(',')]


def process_word_document(file_path, section, user):
    """
    Process Word document and create questions in database.
    Auto-detects language (English or Vietnamese).
    Automatically skips duplicate questions (same prompt + options).
    
    Args:
        file_path: Path to the .docx file
        section: Section object to attach questions to
        user: User who is creating the questions
    
    Returns:
        dict with 'success', 'created_count', 'skipped_count', 'skipped_duplicates', 'errors', 'language'
    """
    result = {
        "success": False,
        "created_count": 0,
        "skipped_count": 0,
        "skipped_duplicates": [],
        "errors": [],
        "language": "unknown"
    }
    
    try:
        print(f"[process_word_document] Starting to process: {file_path}")
        
        # Parse document
        questions_data = WordQuestionParser.parse_document(file_path)
        
        if not questions_data:
            result["errors"].append("No questions found in document")
            print("[process_word_document] No questions found")
            return result
        
        # Detect language from first question
        if questions_data:
            first_prompt = questions_data[0]["question"]["prompt"]
            result["language"] = WordQuestionParser.detect_language(first_prompt)
        
        print(f"[process_word_document] Found {len(questions_data)} questions to create")
        
        # ── Build fingerprint set from existing questions in this section ──
        existing_questions = section.questions.filter(is_active=True).prefetch_related('options')
        existing_fingerprints = set()
        for eq in existing_questions:
            opts_texts = [opt.text for opt in eq.options.all()]
            fp = compute_fingerprint(eq.prompt, opts_texts)
            existing_fingerprints.add(fp)
        
        print(f"[process_word_document] Existing fingerprints in section: {len(existing_fingerprints)}")
        
        # Also track fingerprints within the current upload batch to avoid intra-file duplicates
        batch_fingerprints = set()
        
        # Create questions and options
        created_count = 0
        skipped_count = 0
        skipped_duplicates = []
        
        for idx, data in enumerate(questions_data, 1):
            try:
                question_data = data["question"]
                options_data = data["options"]
                
                # Compute fingerprint for the new question
                new_opts_texts = [opt["text"] for opt in options_data]
                fp = compute_fingerprint(question_data["prompt"], new_opts_texts)
                
                # Check for duplicates
                if fp in existing_fingerprints or fp in batch_fingerprints:
                    skipped_count += 1
                    skipped_duplicates.append(question_data["prompt"][:80])
                    print(f"[process_word_document] SKIPPED duplicate question {idx}: {question_data['prompt'][:50]}...")
                    continue
                
                # Not a duplicate → create
                batch_fingerprints.add(fp)
                
                print(f"[process_word_document] Creating question {idx}: {question_data['prompt'][:50]}...")
                
                question = Question.objects.create(
                    section=section,
                    created_by=user,
                    prompt=question_data["prompt"],
                    question_type=question_data["question_type"],
                    correct_answer_text=question_data.get("correct_answer_text")
                )
                
                # Create options
                for opt_data in options_data:
                    AnswerOption.objects.create(
                        question=question,
                        text=opt_data["text"],
                        is_correct_bool=opt_data.get("is_correct_bool", False),
                        correct_order=opt_data.get("correct_order"),
                        order=opt_data["order"]
                    )
                
                created_count += 1
                
            except Exception as e:
                error_msg = f"Error creating question '{data['question']['prompt'][:50]}...': {str(e)}"
                result["errors"].append(error_msg)
                print(f"[process_word_document] {error_msg}")
                import traceback
                traceback.print_exc()
                continue
        
        result["created_count"] = created_count
        result["skipped_count"] = skipped_count
        result["skipped_duplicates"] = skipped_duplicates
        result["success"] = created_count > 0 or skipped_count > 0
        
        print(f"[process_word_document] Created {created_count}, Skipped {skipped_count} duplicates")
        
    except Exception as e:
        error_msg = f"Critical error: {str(e)}"
        result["errors"].append(error_msg)
        print(f"[process_word_document] {error_msg}")
        import traceback
        traceback.print_exc()
    
    return result