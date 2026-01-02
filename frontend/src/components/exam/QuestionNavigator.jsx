import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function QuestionNavigator({
  questions,
  currentQuestionIndex,
  answers,
  onQuestionClick,
}) {
  const isAnswered = (questionId) => {
    // Lấy object bao bọc (wrapper) từ state answers
    const answerWrapper = answers[questionId];

    // Nếu không có wrapper hoặc chưa có dữ liệu trả lời, trả về false
    if (!answerWrapper || !answerWrapper.answer_data) return false;

    // Lấy dữ liệu trả lời thực tế
    const data = answerWrapper.answer_data;

    if (typeof data.text === "string" && data.text.trim() !== "") return true;

    // Kiểm tra từng loại câu hỏi
    if (data.selected_options && data.selected_options.length > 0) return true;

    // Điền từ: Có mảng answers và ít nhất 1 ô không rỗng
    if (
      data.answers &&
      data.answers.some(
        (a) => a !== null && a !== undefined && a.toString().trim() !== ""
      )
    )
      return true;

    // - Sắp xếp: Có mảng order
    if (data.order && data.order.length > 0) return true;

    return false;
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-700 mb-3">
        Questions Navigator
      </p>
      <div className="grid grid-cols-5 gap-2">
        {questions.map((examQuestion, index) => {
          const qId = examQuestion.question.id;
          const answered = isAnswered(qId);
          // Logic xác định câu hiện tại (dựa trên click scroll hoặc logic khác từ cha)
          // Lưu ý: Nếu bạn muốn highlight câu đang xem chính xác, currentQuestionIndex phải được truyền đúng từ TakeExam
          const isCurrent = index === currentQuestionIndex;

          return (
            <Button
              key={qId}
              onClick={() => onQuestionClick(index)}
              variant="outline"
              className={`
                relative h-12 p-0 transition-all border-2
                ${
                  isCurrent
                    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white" // Ưu tiên 1: Đang chọn (Màu xanh dương đậm)
                    : answered
                    ? "bg-emerald-100 text-emerald-700 border-emerald-500 hover:bg-emerald-200" // Ưu tiên 2: Đã làm (Màu xanh lá)
                    : "bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600" // Ưu tiên 3: Chưa làm (Màu trắng)
                }
              `}
            >
              <div className="flex flex-col items-center justify-center w-full h-full">
                <span className="text-sm font-bold">{index + 1}</span>

                {/* Icon check chỉ hiện khi ĐÃ LÀM và KHÔNG PHẢI câu hiện tại (để đỡ rối mắt) */}
                {answered && !isCurrent && (
                  <CheckCircle className="h-3 w-3 absolute top-1 right-1 text-emerald-600" />
                )}
              </div>
            </Button>
          );
        })}
      </div>

      {/* Chú thích màu sắc (Legend) - Tùy chọn thêm cho đẹp */}
      <div className="flex gap-4 mt-4 text-xs text-gray-500 justify-center">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-emerald-100 border border-emerald-500 rounded"></div>
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-white border border-gray-200 rounded"></div>
          <span>Unanswered</span>
        </div>
      </div>
    </div>
  );
}
