# Bảng theo dõi tiến độ hoàn thiện OMR Scanner (Template-driven)

Tài liệu này dùng để theo dõi (tick ✔️) các tính năng và xử lý lỗi cần hoàn thiện cho hệ thống chấm điểm OMR dựa trên kiến trúc của OMRChecker.

## 1. Kiến trúc Template-driven (JSON)

- [ ] Xây dựng file `omr_template.json` định nghĩa layout phiếu thi.
  - [ ] Khai báo kích thước chuẩn `target_warp_width`, `target_warp_height`.
  - [ ] Định nghĩa tọa độ `relative` (tỷ lệ phần trăm) cho khối (ROI): `student_id`.
  - [ ] Định nghĩa tọa độ `relative` cho khối: `variant_code` (Mã đề).
  - [ ] Định nghĩa tọa độ `relative` cho khối: `answers` (Danh sách các cột đáp án).
- [ ] Viết module (vd: `template_parser.py`) để đọc và scale tọa độ động từ `omr_template.json` theo kích thước ảnh thực tế sau khi warp.

## 2. Tiền xử lý ảnh (Image Preprocessing)

- [ ] Chuyển ảnh sang Grayscale & Blur để khử nhiễu.
- [ ] Phát hiện góc (Corner Detection) & Cắt phẳng ảnh (Perspective Transform).
  - [ ] Ưu tiên 1: Lọc contour tìm 4 ô vuông đen ở 4 góc giới hạn.
  - [ ] Ưu tiên 2: Edge detection tìm viền hình chữ nhật lớn nhất (giấy).
  - [ ] Tự động xoay ảnh (Auto-orientation) nếu ảnh bị chụp ngược.
- [ ] Resize ảnh sau khi kéo phẳng về kích thước chuẩn định nghĩa trong `template.json`.
- [ ] Cân bằng sáng (Adaptive Thresholding) để xử lý ảnh bị bóng/chói sáng.

## 3. Thuật toán chấm điểm (ROI & Relative Fill Ratio)

- [ ] Cắt ROI chính xác dựa trên tọa độ scale từ Template.
- [ ] Chia Grid cho từng khối: tính toán số hàng dọc (digits/questions) và ngang (0-9 hoặc A,B,C,D).
- [ ] Logic lấy điểm (Pixel counting): Lấy tổng số lượng pixel trắng trong từng ô bubble (sau Threshold nghịch đảo).
- [ ] **Logic Relative Ratio (Quan trọng)**: Thay vì dùng ngưỡng cứng (threshold), so sánh pixel của ô với median của cả cột/hàng.
  - [ ] Tính `median` pixel của dãy bọt khí.
  - [ ] Ô tô đậm (Filled) là ô có giá trị `>= median * 1.8` (hoặc hệ số thiết lập).
- [ ] **Phát hiện Multiple/Blank**:
  - [ ] `BLANK`: Nếu không có ô nào trong hàng/cột đạt ngưỡng `median * 1.8`.
  - [ ] `MULTIPLE`: Nếu có >= 2 ô cùng vượt ngưỡng và có giá trị xấp xỉ nhau.
  - [ ] `VALID`: Chỉ duy nhất 1 ô vượt ngưỡng.

## 4. Xử lý nghiệp vụ & Xử lý lỗi (Error Handling Cases)

### 4.1. Lỗi tiền xử lý thẻ giấy

- [ ] **Lỗi không tìm thấy 4 góc**: Quá mờ, thẻ bị rách, chụp mất góc.
  - _Handle_: Throw lỗi `SCAN_MARKERS_NOT_FOUND` -> Yêu cầu người dùng chụp lại/đưa gần hơn.
- [ ] **Lỗi thẻ quá nghiêng**: Góc chụp quá hẹp không thể perspective transform chính xác.
  - _Handle_: Báo lỗi `SKEW_TOO_HIGH` -> Báo trên UI chỉnh góc điện thoại.
- [ ] **Lỗi bóng râm che mất một khoảng**: Bóng điện thoại/đầu người in lên giấy.
  - _Handle_: Giải quyết triệt để ở bước dùng `Adaptive Thresholding` thay vì `Global Thresholding`.

### 4.2. Lỗi khối thông tin Thí sinh (MSSV)

- [ ] Thí sinh bỏ trống (Blank) 1 cột bất kỳ trong MSSV.
  - _Handle_: Digit đó bằng `?`, hệ thống cảnh báo "Không nhận dạng được đầy đủ MSSV". Đưa vào danh sách cần review thủ công.
- [ ] Thí sinh tô 2 ô trong 1 cột MSSV (Multiple).
  - _Handle_: Hệ thống ghi nhận lỗi logic, gán digit bằng `?`.
- [ ] Trùng MSSV trong cùng 1 phòng thi (nếu nhận dạng nhầm do tô mờ).
  - _Handle_: Check collision, nếu có duplicate phải raise warning chờ review.

### 4.3. Lỗi khối Mã đề (Variant Code)

- [ ] Thí sinh tô sai/bỏ trống/tô đúp mã đề.
  - _Handle_: Hoàn toàn không chấm được bài. Reject submission ngay lập tức và yêu cầu kiểm tra/nhập thủ công mã đề.
- [ ] Mã đề nhận dạng được nhưng không nằm trong Database (hoặc danh sách mã đề của bài test).
  - _Handle_: `INVALID_VARIANT_CODE`, báo động đỏ phía Client "Mã đề {XYZ} không tồn tại".

### 4.4. Lỗi khối Đáp án (Answers)

- [ ] Câu hỏi thí sinh không tô (Blank).
  - _Handle_: Ghi nhận câu đó sai (0 điểm), lưu lý do `BLANK` vào database (để track report gửi học sinh).
- [ ] Câu hỏi thí sinh tô nhiều đáp án (Multiple).
  - _Handle_: Ghi nhận câu đó sai (0 điểm), lưu lý do `MULTIPLE` vào database.
- [ ] Thí sinh tẩy xóa, để lại vệt mờ.
  - _Handle_: Thuật toán Relative Ratio sẽ loại bỏ vệt mờ do nó thường yếu hơn ô được tô đậm. Tuy nhiên nếu pixel vệt mờ vẫn cao thì sẽ dính lỗi `MULTIPLE` -> 0 điểm, công bằng.

## 5. Cải thiện trải nghiệm tải ảnh / Camera

- [ ] REST API trả về phản hồi chuẩn hóa thay vì quăng Exception thẳng ra console:
  ```json
  {
    "success": false,
    "error_code": "VARIANT_NOT_FOUND",
    "message": "Không thể đọc mã đề. Vui lòng kiểm tra lại ảnh.",
    "debug_image_url": "..."
  }
  ```
- [ ] [Camera Front-end] Vẽ Overlay khung chữ nhật có 4 góc. Xanh lá nếu detect được giấy, Đỏ nếu chưa khớp khung.
