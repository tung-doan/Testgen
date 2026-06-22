# CHƯƠNG 4. THIẾT KẾ, TRIỂN KHAI VÀ ĐÁNH GIÁ HỆ THỐNG

Chương này trình bày quá trình thiết kế, xây dựng, kiểm thử và triển khai hệ thống TestGen. Nội dung được tổ chức theo cấu trúc của báo cáo mẫu, gồm các phần: thiết kế kiến trúc, thiết kế chi tiết, thiết kế cơ sở dữ liệu, xây dựng ứng dụng, kiểm thử và triển khai hệ thống.

## 4.1 Thiết kế kiến trúc

### 4.1.1 Lựa chọn kiến trúc phần mềm

Hệ thống TestGen được xây dựng theo kiến trúc client-server kết hợp mô hình REST API. Trong đó, phía client đảm nhiệm vai trò hiển thị giao diện, tiếp nhận thao tác của người dùng và gửi yêu cầu đến máy chủ. Phía server xử lý nghiệp vụ, kiểm tra quyền truy cập, thao tác với cơ sở dữ liệu và trả dữ liệu về client dưới dạng JSON.

Kiến trúc này phù hợp với bài toán xây dựng hệ thống hỗ trợ quản lý lớp học, ngân hàng câu hỏi, tạo đề thi online, tạo đề giấy và chấm bài tự động. Các chức năng của hệ thống có phạm vi xử lý khác nhau, do đó việc tách frontend và backend giúp hệ thống dễ phát triển, dễ kiểm thử và thuận tiện khi mở rộng.

Frontend của hệ thống được xây dựng bằng Next.js và React. Người dùng thao tác với các màn hình như đăng nhập, quản lý lớp học, ngân hàng câu hỏi, tạo đề thi, làm bài thi online, xem lịch sử làm bài và thống kê kết quả. Frontend giao tiếp với backend thông qua các service sử dụng Axios.

Backend của hệ thống được xây dựng bằng Django REST Framework. Các module nghiệp vụ chính được tách thành các ứng dụng riêng gồm: `users`, `classrooms`, `question_bank`, `exam` và `online_exams`. Việc chia module giúp mã nguồn có cấu trúc rõ ràng, mỗi nhóm chức năng có model, serializer, view và url riêng.

Cơ sở dữ liệu sử dụng PostgreSQL để lưu trữ dữ liệu có quan hệ như người dùng, lớp học, sinh viên, câu hỏi, đề thi, lượt làm bài và kết quả. Ngoài ra, hệ thống sử dụng Cloudinary để lưu trữ ảnh đại diện, ảnh câu hỏi và ảnh phiếu trả lời. Redis và Celery được sử dụng cho các tác vụ nền như tự động công bố đề thi đến thời điểm được cấu hình và dọn dẹp các yêu cầu tham gia lớp đã hết hạn.

### 4.1.2 Thiết kế tổng quan

Về tổng thể, hệ thống gồm năm thành phần chính:

- Giao diện người dùng: được xây dựng bằng Next.js, React và Tailwind CSS.
- API server: được xây dựng bằng Django REST Framework, cung cấp các API cho frontend.
- Cơ sở dữ liệu: PostgreSQL lưu trữ dữ liệu nghiệp vụ chính.
- Dịch vụ lưu trữ tệp: Cloudinary lưu ảnh và tài nguyên liên quan đến bài thi.
- Hàng đợi tác vụ nền: Redis và Celery xử lý các công việc định kỳ hoặc chạy nền.

Luồng hoạt động tổng quát của hệ thống như sau: người dùng đăng nhập vào hệ thống, frontend nhận token xác thực và gửi token kèm theo các request tiếp theo. Backend kiểm tra token bằng Simple JWT, xác định người dùng hiện tại, sau đó xử lý nghiệp vụ tương ứng. Kết quả được trả về frontend để hiển thị cho giáo viên hoặc sinh viên.

Đối với giáo viên, hệ thống hỗ trợ quản lý lớp học, quản lý danh sách sinh viên, xây dựng ngân hàng câu hỏi, tạo đề thi online, tạo đề giấy, tải phiếu trả lời OMR và xem thống kê kết quả. Đối với sinh viên, hệ thống hỗ trợ đăng ký/đăng nhập, gửi yêu cầu tham gia lớp, làm bài thi online, xem kết quả và lịch sử làm bài.

### 4.1.3 Thiết kế chi tiết gói

Hệ thống được chia thành các gói chức năng chính như sau:

Gói quản lý tài khoản (`users`) phụ trách đăng ký, đăng nhập, đăng xuất, làm mới token, lấy thông tin người dùng và khôi phục mật khẩu. Hệ thống sử dụng custom user model kế thừa `AbstractUser`, bổ sung các trường như email, họ tên, ngày sinh, giới tính, trạng thái xác thực và ảnh đại diện.

Gói quản lý lớp học (`classrooms`) phụ trách tạo lớp, cập nhật lớp, quản lý sinh viên, xử lý yêu cầu tham gia lớp và lời mời vào lớp. Mỗi lớp học gắn với một giáo viên, sinh viên có thể thuộc nhiều lớp học thông qua quan hệ nhiều-nhiều.

Gói ngân hàng câu hỏi (`question_bank`) phụ trách quản lý môn học, chương, mục và câu hỏi. Hệ thống hỗ trợ nhiều dạng câu hỏi gồm trắc nghiệm nhiều lựa chọn, đúng/sai mở rộng, sắp xếp thứ tự và điền khuyết. Các đáp án được lưu trong bảng riêng để thuận tiện cho việc chấm điểm và tái sử dụng câu hỏi trong nhiều đề thi.

Gói đề thi giấy (`exam`) phụ trách tạo đề giấy, sinh nhiều mã đề, trộn thứ tự câu hỏi và đáp án, sinh phiếu trả lời OMR, nhận ảnh bài làm và chấm điểm tự động. Phần xử lý OMR sử dụng OpenCV để nhận diện giấy, căn chỉnh phối cảnh, xác định vùng tô đáp án và tính kết quả.

Gói đề thi online (`online_exams`) phụ trách tạo đề thi trực tuyến, cấu hình thời gian làm bài, số lần làm bài, thời điểm công bố đề, lưu lượt làm bài và chấm điểm theo từng loại câu hỏi. Hệ thống có cơ chế tự động hoàn thành bài khi hết thời gian và quy đổi điểm về thang 10.

## 4.2 Thiết kế chi tiết

### 4.2.1 Thiết kế giao diện

Giao diện hệ thống được thiết kế theo hướng rõ ràng, tập trung vào các thao tác thường dùng của giáo viên và sinh viên. Các màn hình được tổ chức theo từng nhóm chức năng để người dùng dễ tìm kiếm và thao tác.

Đối với giáo viên, hệ thống có các giao diện chính:

- Giao diện đăng nhập và đăng ký tài khoản.
- Giao diện quản lý lớp học.
- Giao diện chi tiết lớp học và danh sách sinh viên.
- Giao diện ngân hàng câu hỏi theo môn học, chương và mục.
- Giao diện tạo đề thi online.
- Giao diện tạo đề thi giấy.
- Giao diện danh sách đề thi và chi tiết đề thi.
- Giao diện thống kê kết quả học tập.

Đối với sinh viên, hệ thống có các giao diện chính:

- Giao diện đăng nhập và đăng ký dành cho sinh viên.
- Giao diện dashboard sinh viên.
- Giao diện danh sách lớp học đã tham gia.
- Giao diện yêu cầu tham gia lớp hoặc xử lý lời mời.
- Giao diện làm bài thi online.
- Giao diện xem kết quả và lịch sử làm bài.

Các giao diện được xây dựng theo cấu trúc component của React. Một số component dùng chung như `Navbar`, `Header`, `LoadingScreen`, `Notification`, `DeleteConfirmButton` và các thành phần UI như button, dialog, table, select, tabs được tách riêng để tái sử dụng. Cách tổ chức này giúp giảm lặp mã nguồn và đảm bảo sự thống nhất về giao diện trong toàn hệ thống.

Trong báo cáo chính thức, có thể bổ sung các hình minh họa sau:

- Hình 4.1: Giao diện trang chủ hệ thống TestGen.
- Hình 4.2: Giao diện đăng nhập.
- Hình 4.3: Giao diện quản lý lớp học.
- Hình 4.4: Giao diện ngân hàng câu hỏi.
- Hình 4.5: Giao diện tạo đề thi online.
- Hình 4.6: Giao diện tạo đề thi giấy.
- Hình 4.7: Giao diện làm bài thi của sinh viên.
- Hình 4.8: Giao diện thống kê kết quả.

### 4.2.2 Thiết kế lớp

Thiết kế lớp của hệ thống tập trung vào các thực thể nghiệp vụ chính. Các lớp được tổ chức theo từng ứng dụng Django, tương ứng với các nhóm chức năng trong hệ thống.

Nhóm lớp người dùng gồm lớp `User`, kế thừa từ `AbstractUser`. Lớp này lưu thông tin tài khoản như username, email, họ tên, ngày sinh, giới tính, trạng thái xác thực và ảnh đại diện. Lớp `User` có phương thức sinh token để phục vụ xác thực bằng JWT.

Nhóm lớp quản lý lớp học gồm `Classroom`, `Student` và `EnrollmentRequest`. Lớp `Classroom` lưu thông tin lớp học và giáo viên phụ trách. Lớp `Student` lưu thông tin sinh viên, mã sinh viên và liên kết với tài khoản người dùng. Lớp `EnrollmentRequest` lưu trạng thái yêu cầu tham gia lớp hoặc lời mời từ giáo viên.

Nhóm lớp ngân hàng câu hỏi gồm `Subject`, `Chapter`, `Section`, `Question` và `AnswerOption`. Các lớp này tạo thành cấu trúc phân cấp từ môn học đến chương, mục và câu hỏi. Lớp `Question` lưu nội dung câu hỏi, loại câu hỏi, đáp án dạng văn bản nếu là câu điền khuyết và ảnh minh họa nếu có. Lớp `AnswerOption` lưu các phương án trả lời, đáp án đúng/sai hoặc thứ tự đúng tùy theo loại câu hỏi.

Nhóm lớp đề thi giấy gồm `PaperTest`, `PaperTestQuestion`, `PaperTestVariant`, `PaperSubmission`, `PaperAnswerDetected` và `PaperUserAnswer`. Lớp `PaperTest` lưu thông tin đề thi giấy, số lượng câu hỏi, số lựa chọn và số mã đề. Lớp `PaperTestVariant` lưu thứ tự câu hỏi và thứ tự đáp án sau khi trộn. Lớp `PaperSubmission` lưu ảnh bài làm, sinh viên nộp bài, mã đề được nhận diện và tổng điểm.

Nhóm lớp đề thi online gồm `Exam`, `ExamQuestion`, `ExamAttempt` và `OnlineAnswer`. Lớp `Exam` lưu thông tin đề thi, thời lượng, số lần làm bài, trạng thái công bố và thời điểm công bố. Lớp `ExamAttempt` lưu lượt làm bài của sinh viên, thời gian bắt đầu, thời gian kết thúc, trạng thái và điểm cuối cùng. Lớp `OnlineAnswer` lưu câu trả lời của sinh viên ở dạng JSON để hỗ trợ nhiều loại câu hỏi.

Trong báo cáo chính thức, có thể bổ sung biểu đồ lớp cho các nhóm sau:

- Biểu đồ lớp quản lý tài khoản và lớp học.
- Biểu đồ lớp ngân hàng câu hỏi.
- Biểu đồ lớp đề thi online.
- Biểu đồ lớp đề thi giấy và chấm OMR.

## 4.3 Thiết kế cơ sở dữ liệu

Cơ sở dữ liệu của hệ thống được thiết kế theo mô hình quan hệ, phù hợp với các nghiệp vụ có nhiều liên kết như giáo viên - lớp học - sinh viên - đề thi - câu hỏi - kết quả. PostgreSQL được lựa chọn vì hỗ trợ tốt các ràng buộc quan hệ, truy vấn phức tạp và các trường dữ liệu JSON.

Các thực thể chính của hệ thống gồm:

Thực thể `User` đại diện cho tài khoản người dùng. Các thuộc tính chính gồm username, email, full_name, date_of_birth, gender, is_authorized và avatar.

Thực thể `Classroom` đại diện cho lớp học. Các thuộc tính chính gồm name, description, created_at và teacher. Một giáo viên có thể tạo nhiều lớp học.

Thực thể `Student` đại diện cho sinh viên. Các thuộc tính chính gồm name, student_id, created_at và user. Sinh viên có thể tham gia nhiều lớp học.

Thực thể `EnrollmentRequest` đại diện cho yêu cầu tham gia lớp hoặc lời mời vào lớp. Các thuộc tính chính gồm student, classroom, status, request_type, invited_by, created_at và updated_at.

Thực thể `Subject`, `Chapter`, `Section` tổ chức ngân hàng câu hỏi theo cấu trúc phân cấp. Một môn học có nhiều chương, một chương có nhiều mục, một mục có nhiều câu hỏi.

Thực thể `Question` đại diện cho câu hỏi trong ngân hàng câu hỏi. Các thuộc tính chính gồm section, created_by, prompt, question_type, correct_answer_text, image, created_at, updated_at và is_active.

Thực thể `AnswerOption` đại diện cho phương án trả lời của câu hỏi. Các thuộc tính chính gồm question, text, is_correct_bool, correct_order và order.

Thực thể `Exam` đại diện cho đề thi online. Các thuộc tính chính gồm title, description, created_by, classroom, duration_minutes, max_attempts, show_results_immediately, is_published, publish_at và generation_config.

Thực thể `ExamAttempt` đại diện cho lượt làm bài online của sinh viên. Các thuộc tính chính gồm exam, student, status, start_time, end_time và final_score.

Thực thể `OnlineAnswer` đại diện cho câu trả lời online. Dữ liệu câu trả lời được lưu trong trường `answer_data` dạng JSON để hỗ trợ linh hoạt nhiều dạng câu hỏi.

Thực thể `PaperTest` đại diện cho đề thi giấy. Các thuộc tính chính gồm title, description, num_questions, num_choices, allow_multiple_answers, created_by, classroom, num_variants và created_at.

Thực thể `PaperTestVariant` đại diện cho mã đề của đề thi giấy. Các thuộc tính chính gồm test, variant_code, question_order và answer_shuffles.

Thực thể `PaperSubmission` đại diện cho bài làm giấy đã nộp. Các thuộc tính chính gồm test, user, student, variant, detected_mssv, submission_image, submitted_at và total_score.

Từ các thực thể trên, hệ thống hình thành các quan hệ chính:

- `User` một-nhiều `Classroom`.
- `Classroom` nhiều-nhiều `Student`.
- `Student` một-nhiều `ExamAttempt`.
- `Classroom` một-nhiều `Exam` và `PaperTest`.
- `Subject` một-nhiều `Chapter`.
- `Chapter` một-nhiều `Section`.
- `Section` một-nhiều `Question`.
- `Question` một-nhiều `AnswerOption`.
- `Exam` nhiều-nhiều `Question` thông qua `ExamQuestion`.
- `PaperTest` nhiều-nhiều `Question` thông qua `PaperTestQuestion`.
- `PaperTest` một-nhiều `PaperTestVariant` và `PaperSubmission`.

Trong báo cáo chính thức, có thể bổ sung hình ERD của hệ thống tại mục này để minh họa trực quan các bảng và quan hệ.

## 4.4 Xây dựng ứng dụng

### 4.4.1 Thư viện và công cụ sử dụng

| Mục đích | Công cụ/Thư viện | Ghi chú |
| --- | --- | --- |
| Xây dựng frontend | Next.js 15.2.4, React 19 | Xây dựng giao diện và định tuyến phía client |
| Thiết kế giao diện | Tailwind CSS, Radix UI, Lucide React | Xây dựng component và biểu tượng |
| Gọi API | Axios | Kết nối frontend với backend |
| Xây dựng backend | Django 4.2, Django REST Framework | Xây dựng API và xử lý nghiệp vụ |
| Xác thực | Simple JWT | Xác thực bằng access token và refresh token |
| Cơ sở dữ liệu | PostgreSQL | Lưu trữ dữ liệu quan hệ |
| Lưu trữ ảnh | Cloudinary | Lưu ảnh đại diện, ảnh câu hỏi, ảnh bài làm |
| Xử lý ảnh OMR | OpenCV, imutils, NumPy | Nhận diện phiếu trả lời và vùng tô đáp án |
| Sinh PDF | ReportLab | Sinh phiếu trả lời OMR và tài liệu đề thi |
| Tác vụ nền | Celery, Redis | Xử lý lịch công bố đề và tác vụ định kỳ |
| Đóng gói triển khai | Docker, Docker Compose | Chạy đồng bộ frontend, backend, Redis và Celery |
| Quản lý mã nguồn | Git | Quản lý phiên bản mã nguồn |
| IDE lập trình | Visual Studio Code | Môi trường phát triển |
| Thiết kế UML | Astah UML | Thiết kế use case, class diagram, sequence diagram |

Bảng 4.1: Danh sách thư viện và công cụ sử dụng

### 4.4.2 Kết quả đạt được

Sau quá trình phân tích, thiết kế và phát triển, hệ thống TestGen đã xây dựng được các chức năng chính phục vụ cả giáo viên và sinh viên.

Đối với giáo viên, hệ thống cho phép tạo và quản lý lớp học, mời sinh viên vào lớp, duyệt yêu cầu tham gia lớp, xây dựng ngân hàng câu hỏi, tạo đề thi online, tạo đề thi giấy nhiều mã đề, sinh phiếu trả lời OMR, chấm bài từ ảnh phiếu trả lời và xem thống kê kết quả học tập.

Đối với sinh viên, hệ thống cho phép đăng ký tài khoản, đăng nhập, tham gia lớp học, nhận lời mời vào lớp, làm bài thi online, xem kết quả sau khi nộp bài và theo dõi lịch sử làm bài.

Các thông số mã nguồn chính của hệ thống được thống kê như sau:

| Hạng mục | Mô tả |
| --- | --- |
| Số file mã nguồn chính | 211 file |
| Dung lượng mã nguồn chính | Khoảng 1.3 MB |
| Số dòng mã nguồn | Khoảng 32.251 dòng |

Bảng 4.2: Thống kê thông tin mã nguồn hệ thống

### 4.4.3 Minh họa các chức năng chính

Giao diện trang chủ là màn hình đầu tiên khi người dùng truy cập hệ thống. Từ đây người dùng có thể chuyển sang đăng nhập, đăng ký hoặc xem thông tin giới thiệu hệ thống.

Giao diện đăng nhập cho phép giáo viên và sinh viên xác thực tài khoản. Sau khi đăng nhập thành công, hệ thống lưu token xác thực và chuyển người dùng đến màn hình phù hợp với vai trò sử dụng.

Giao diện quản lý lớp học cho phép giáo viên tạo lớp mới, xem danh sách lớp, cập nhật thông tin lớp và truy cập màn hình chi tiết lớp. Tại màn hình chi tiết, giáo viên có thể xem danh sách sinh viên, gửi lời mời vào lớp và xử lý yêu cầu tham gia lớp.

Giao diện ngân hàng câu hỏi cho phép giáo viên tổ chức câu hỏi theo môn học, chương và mục. Giáo viên có thể thêm, sửa, xóa mềm câu hỏi và quản lý các phương án trả lời. Hệ thống hỗ trợ nhiều dạng câu hỏi để phục vụ cả đề thi online và đề giấy.

Giao diện tạo đề thi online cho phép giáo viên nhập thông tin đề thi, chọn lớp học, chọn câu hỏi, cấu hình thời gian làm bài, số lần làm bài và trạng thái công bố. Khi sinh viên làm bài, hệ thống lưu từng lượt làm bài và chấm điểm dựa trên loại câu hỏi.

Giao diện tạo đề thi giấy cho phép giáo viên chọn câu hỏi, cấu hình số lượng câu, số lựa chọn, số mã đề và sinh phiếu OMR. Hệ thống có thể trộn thứ tự câu hỏi và đáp án để tạo nhiều mã đề khác nhau.

Giao diện chấm bài OMR cho phép giáo viên tải ảnh phiếu trả lời lên hệ thống. Backend xử lý ảnh bằng OpenCV, căn chỉnh phiếu trả lời, nhận diện mã sinh viên, mã đề và vùng tô đáp án, sau đó đối chiếu với đáp án đúng để tính điểm.

Giao diện làm bài thi online của sinh viên hiển thị danh sách câu hỏi, thời gian làm bài và các lựa chọn trả lời. Sau khi nộp bài hoặc hết giờ, hệ thống ghi nhận lượt làm bài, chấm điểm và lưu kết quả.

Giao diện thống kê kết quả cho phép giáo viên xem điểm của sinh viên theo lớp, theo đề thi và theo hình thức làm bài. Đây là cơ sở để giáo viên đánh giá tình hình học tập và chất lượng đề thi.

## 4.5 Kiểm thử

Quá trình kiểm thử tập trung vào các chức năng chính của hệ thống. Kỹ thuật kiểm thử sử dụng chủ yếu là kiểm thử hộp đen, trong đó hệ thống được đánh giá thông qua đầu vào, thao tác người dùng và kết quả đầu ra mong đợi.

### 4.5.1 Kiểm thử chức năng quản lý ngân hàng câu hỏi

Mô tả chức năng: Giáo viên đăng nhập vào hệ thống, truy cập ngân hàng câu hỏi và thực hiện các thao tác quản lý môn học, chương, mục, câu hỏi và đáp án.

Kỹ thuật kiểm thử sử dụng: kiểm thử hộp đen.

| STT | Tình huống kiểm thử | Đầu vào | Kết quả mong đợi |
| --- | --- | --- | --- |
| 1 | Tạo môn học mới | Tên môn học | Môn học được thêm vào danh sách |
| 2 | Tạo chương trong môn học | Tên chương, thứ tự chương | Chương được hiển thị trong đúng môn học |
| 3 | Tạo câu hỏi trắc nghiệm | Nội dung câu hỏi, các đáp án, đáp án đúng | Câu hỏi được lưu và hiển thị đúng thông tin |
| 4 | Tạo câu hỏi điền khuyết | Nội dung câu hỏi, danh sách đáp án đúng | Câu hỏi được lưu và có thể dùng trong đề online |
| 5 | Xóa mềm câu hỏi | ID câu hỏi | Câu hỏi không còn hiển thị trong danh sách đang hoạt động |

Bảng 4.3: Kiểm thử chức năng quản lý ngân hàng câu hỏi

### 4.5.2 Kiểm thử chức năng tạo và làm bài thi online

Mô tả chức năng: Giáo viên tạo đề thi online từ ngân hàng câu hỏi. Sinh viên vào lớp, mở đề thi, làm bài và nộp bài.

Kỹ thuật kiểm thử sử dụng: kiểm thử hộp đen.

| STT | Tình huống kiểm thử | Đầu vào | Kết quả mong đợi |
| --- | --- | --- | --- |
| 1 | Tạo đề thi online | Tiêu đề, lớp học, thời lượng, danh sách câu hỏi | Đề thi được tạo và hiển thị trong danh sách |
| 2 | Cấu hình lịch công bố đề | Thời điểm công bố | Đề chưa hiển thị trước thời điểm công bố và được công bố đúng lịch |
| 3 | Sinh viên bắt đầu làm bài | Chọn đề thi hợp lệ | Hệ thống tạo lượt làm bài với trạng thái IN_PROGRESS |
| 4 | Sinh viên nộp bài | Dữ liệu câu trả lời | Hệ thống chấm điểm và lưu kết quả |
| 5 | Hết thời gian làm bài | Không nộp bài thủ công | Hệ thống tự hoàn thành bài và tính điểm dựa trên câu đã trả lời |

Bảng 4.4: Kiểm thử chức năng tạo và làm bài thi online

### 4.5.3 Kiểm thử chức năng tạo đề giấy và chấm OMR

Mô tả chức năng: Giáo viên tạo đề thi giấy, sinh nhiều mã đề, sinh phiếu trả lời OMR, tải ảnh bài làm lên hệ thống và nhận kết quả chấm điểm.

Kỹ thuật kiểm thử sử dụng: kiểm thử hộp đen kết hợp kiểm thử dữ liệu ảnh thực tế.

| STT | Tình huống kiểm thử | Đầu vào | Kết quả mong đợi |
| --- | --- | --- | --- |
| 1 | Tạo đề thi giấy | Tiêu đề, lớp học, số câu hỏi, số mã đề | Đề giấy được tạo thành công |
| 2 | Sinh mã đề | Số lượng mã đề | Hệ thống tạo các mã đề với thứ tự câu hỏi và đáp án khác nhau |
| 3 | Sinh phiếu OMR | Số câu hỏi của đề | Phiếu trả lời được sinh theo đúng template 20, 40, 60, 80 hoặc 100 câu |
| 4 | Tải ảnh bài làm rõ nét | Ảnh phiếu trả lời | Hệ thống nhận diện mã sinh viên, mã đề, đáp án và tính điểm |
| 5 | Tải ảnh bị lệch góc | Ảnh chụp lệch nhẹ | Hệ thống căn chỉnh phối cảnh và xử lý được nếu vẫn đủ marker |
| 6 | Tải ảnh không hợp lệ | Ảnh không phải phiếu trả lời | Hệ thống báo lỗi và yêu cầu chụp lại |

Bảng 4.5: Kiểm thử chức năng tạo đề giấy và chấm OMR

## 4.6 Triển khai

Hệ thống được chuẩn bị triển khai bằng Docker Compose. Cấu hình triển khai gồm các service chính: `frontend`, `api`, `redis`, `celery_worker` và `celery_beat`.

Service `frontend` build từ thư mục `frontend`, chạy ứng dụng Next.js và mở cổng 3000. Service này gọi API backend thông qua biến môi trường `NEXT_PUBLIC_API_URL`.

Service `api` build từ thư mục `api`, chạy Django bằng Gunicorn trên cổng 8000. Backend đọc cấu hình từ tệp `.env`, kết nối tới PostgreSQL, Cloudinary và Redis.

Service `redis` đóng vai trò message broker và cache. Redis được dùng bởi Celery worker và Celery beat để xử lý tác vụ nền.

Service `celery_worker` chạy các tác vụ nền của hệ thống. Service `celery_beat` chạy các tác vụ định kỳ như tự động công bố đề thi đến lịch và xóa các yêu cầu tham gia lớp hết hạn.

Với cấu trúc triển khai này, hệ thống có thể chạy đồng bộ các thành phần frontend, backend và xử lý nền. Khi cần đưa lên môi trường thật, có thể triển khai frontend lên nền tảng hỗ trợ Next.js, backend lên máy chủ hoặc container platform, PostgreSQL lên dịch vụ cơ sở dữ liệu quản lý, Cloudinary cho lưu trữ ảnh và Redis cho hàng đợi tác vụ nền.

