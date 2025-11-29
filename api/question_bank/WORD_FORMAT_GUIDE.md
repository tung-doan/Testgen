# Word Document Format Guide / Hướng dẫn định dạng file Word

This guide supports both **English** and **Vietnamese** formats. The system automatically detects the language.

## English Format

### 1. Multiple Choice (Single or Multiple Correct Answers)

**Single correct answer:**

```
Question 1: What is the capital of Vietnam?
A. Hanoi
B. Ho Chi Minh City
C. Da Nang
D. Hai Phong
ANSWER: A
```

**Multiple correct answers:**

```
Question 2: Which are prime numbers?
A. 2
B. 3
C. 4
D. 5
ANSWER: A, B, D
```

### 2. True/False Extended

```
Question 3: Evaluate the following statements as True or False:
1. The sun rises in the East
2. The Earth is square
3. Water boils at 100°C
4. Humans have 4 legs
ANSWER: 1-T, 2-F, 3-T, 4-F
```

**Alternative notations:**

- `T` or `TRUE` for True
- `F` or `FALSE` for False

### 3. Ordering

```
Question 4: Arrange the seasons in their natural order:
A. Autumn
B. Spring
C. Summer
D. Winter
CORRECT ORDER: B, C, A, D
```

### 4. Fill in the Blank

```
Question 5: The capital of France is _____?
ANSWER: Paris

Question 6: The chemical formula for water is _____?
ANSWER: H2O
```

---

## Vietnamese Format (Định dạng Tiếng Việt)

### 1. Trắc nghiệm (Multiple Choice)

**Một đáp án đúng:**

```
Câu 1: Thủ đô của Việt Nam là gì?
A. Hà Nội
B. TP. Hồ Chí Minh
C. Đà Nẵng
D. Hải Phòng
ĐÁP ÁN: A
```

**Nhiều đáp án đúng:**

```
Câu 2: Các số nguyên tố là?
A. 2
B. 3
C. 4
D. 5
ĐÁP ÁN: A, B, D
```

### 2. Đúng/Sai mở rộng (True/False Extended)

```
Câu 3: Đánh giá các câu sau đúng/sai:
1. Mặt trời mọc ở phía Đông
2. Trái đất hình vuông
3. Nước sôi ở 100°C
4. Con người có 4 chân
ĐÁP ÁN: 1-Đ, 2-S, 3-Đ, 4-S
```

### 3. Sắp xếp thứ tự (Ordering)

```
Câu 4: Sắp xếp các mùa theo thứ tự trong năm:
A. Thu
B. Xuân
C. Hạ
D. Đông
THỨ TỰ ĐÚNG: B, C, A, D
```

### 4. Điền vào chỗ trống (Fill in the Blank)

```
Câu 5: Thủ đô của Pháp là _____?
ĐÁP ÁN: Paris

Câu 6: Công thức nước là _____?
ĐÁP ÁN: H2O
```

---

## Important Notes / Lưu ý quan trọng

### English Format:

- Each question must start with `Question [number]:`
- Answer line must start with `ANSWER:` or `CORRECT ORDER:`
- Options use capital letters: A, B, C, D...
- For numbered options (True/False), use: 1, 2, 3, 4...
- No unnecessary blank lines between question and answer
- File must be `.docx` format (not `.doc`)

### Vietnamese Format:

- Mỗi câu hỏi phải bắt đầu bằng `Câu [số]:`
- Dòng đáp án phải có `ĐÁP ÁN:` hoặc `THỨ TỰ ĐÚNG:`
- Đáp án dùng chữ cái in hoa: A, B, C, D...
- Đối với câu hỏi Đúng/Sai, dùng số: 1, 2, 3, 4...
- Không có dòng trống không cần thiết giữa câu hỏi và đáp án
- File phải là định dạng `.docx` (không phải `.doc`)

## Language Detection / Phát hiện ngôn ngữ

The system automatically detects the language based on:

- Presence of Vietnamese-specific characters (à, á, ạ, ả, ã, â, ầ, ấ, ậ, ẩ, ẫ, ă, ằ, ắ, ặ, ẳ, ẵ, è, é, ẹ, ẻ, ẽ, ê, ề, ế, ệ, ể, ễ, ì, í, ị, ỉ, ĩ, ò, ó, ọ, ỏ, õ, ô, ồ, ố, ộ, ổ, ỗ, ơ, ờ, ớ, ợ, ở, ỡ, ù, ú, ụ, ủ, ũ, ư, ừ, ứ, ự, ử, ữ, ỳ, ý, ỵ, ỷ, ỹ, đ)
- Keywords: "Câu", "ĐÁP ÁN" vs "Question", "ANSWER"

Hệ thống tự động phát hiện ngôn ngữ dựa trên:

- Ký tự đặc trưng tiếng Việt có dấu
- Từ khóa: "Câu", "ĐÁP ÁN" so với "Question", "ANSWER"

## Example Files / File mẫu

You can download example files at:
Bạn có thể tải file mẫu tại:

- English: [sample_questions_en.docx](sample_questions_en.docx)
- Vietnamese: [sample_questions_vi.docx](sample_questions_vi.docx)
