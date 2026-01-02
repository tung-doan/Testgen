import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function QuestionInput({
  examQuestion,
  currentAnswer,
  onAnswerChange,
}) {
  const { question } = examQuestion;
  const questionId = question.id;

  const options = question.answer_options || [];

  // MULTIPLE CHOICE
  if (question.question_type === "MC") {
    if (options.length === 0) {
      return <div className="text-red-500">No options available</div>;
    }

    // ✅ SỬA: Lấy cờ từ Backend thay vì tự tính
    const isMultiple = question.allow_multiple_answers;

    if (isMultiple) {
      // --- CHECKBOX (Nhiều đáp án) ---
      const selected = currentAnswer?.selected_options || [];
      return (
        <div className="space-y-3">
          <p className="text-sm text-blue-600 mb-2 font-medium bg-blue-50 p-2 rounded inline-block">
            * Chọn nhiều đáp án (Select multiple)
          </p>
          {options.map((option, index) => {
            const isSelected = selected.includes(option.id);
            return (
              <div
                key={option.id}
                onClick={() => {
                  let newSelected;
                  if (isSelected) {
                    newSelected = selected.filter((id) => id !== option.id);
                  } else {
                    newSelected = [...selected, option.id];
                  }
                  onAnswerChange(questionId, { selected_options: newSelected });
                }}
                className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-blue-50 border-blue-500"
                    : "hover:bg-gray-50 border-gray-200"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded border flex items-center justify-center mr-4 ${
                    isSelected
                      ? "bg-blue-600 border-blue-600"
                      : "border-gray-400"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </div>
                <Label className="cursor-pointer flex-1 text-base">
                  <span className="font-semibold mr-2">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option.text}
                </Label>
              </div>
            );
          })}
        </div>
      );
    } else {
      // --- RADIO (Một đáp án) ---
      const selected = currentAnswer?.selected_options?.[0];
      return (
        <div className="space-y-3">
          {/* Có thể thêm dòng nhắc nhở chọn 1 */}
          <p className="text-sm text-gray-500 mb-2 italic">
            * Chọn 1 đáp án đúng nhất
          </p>
          {options.map((option, index) => {
            const isSelected = selected === option.id;
            return (
              <div
                key={option.id}
                onClick={() =>
                  onAnswerChange(questionId, { selected_options: [option.id] })
                }
                className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-blue-50 border-blue-500"
                    : "hover:bg-gray-50 border-gray-200"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border mr-4 flex items-center justify-center ${
                    isSelected ? "border-blue-600" : "border-gray-400"
                  }`}
                >
                  {isSelected && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  )}
                </div>
                <Label className="cursor-pointer flex-1 text-base">
                  <span className="font-semibold mr-2">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  {option.text}
                </Label>
              </div>
            );
          })}
        </div>
      );
    }
  }

  // ==============================
  // 2. TRUE/FALSE EXTENDED (TFE)
  // ==============================
  if (question.question_type === "TFE") {
    // ✅ FIX: Dùng 'options' thay vì 'sub_questions'
    if (options.length === 0) {
      return <div className="text-red-500">No statements available</div>;
    }

    // State lưu: [true, false, null, true...] tương ứng index
    const currentResponses = currentAnswer?.answers || [];

    const handleTFEChange = (index, value) => {
      const newAnswers = [...currentResponses];
      // Fill null nếu mảng chưa đủ dài
      while (newAnswers.length < options.length) {
        newAnswers.push(null);
      }
      newAnswers[index] = value;
      onAnswerChange(questionId, { answers: newAnswers });
    };

    return (
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        {/* Header Table */}
        <div className="grid grid-cols-12 bg-gray-100 p-3 font-semibold text-sm text-gray-700 border-b">
          <div className="col-span-8">Statement</div>
          <div className="col-span-2 text-center">True</div>
          <div className="col-span-2 text-center">False</div>
        </div>

        {/* Rows */}
        <div className="divide-y">
          {options.map((opt, index) => {
            const status = currentResponses[index]; // true / false / null
            return (
              <div
                key={opt.id}
                className="grid grid-cols-12 items-center p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="col-span-8 pr-4 text-base text-gray-800">
                  <span className="font-bold mr-2 text-gray-500">
                    {index + 1}.
                  </span>
                  {opt.text}
                </div>

                {/* True Button */}
                <div className="col-span-2 flex justify-center">
                  <button
                    onClick={() => handleTFEChange(index, true)}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                      status === true
                        ? "bg-green-100 border-green-500 text-green-700 shadow-sm scale-110"
                        : "border-gray-200 text-gray-300 hover:border-green-300 hover:text-green-300"
                    }`}
                  >
                    <Check className="h-6 w-6" strokeWidth={3} />
                  </button>
                </div>

                {/* False Button */}
                <div className="col-span-2 flex justify-center">
                  <button
                    onClick={() => handleTFEChange(index, false)}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                      status === false
                        ? "bg-red-100 border-red-500 text-red-700 shadow-sm scale-110"
                        : "border-gray-200 text-gray-300 hover:border-red-300 hover:text-red-300"
                    }`}
                  >
                    <X className="h-6 w-6" strokeWidth={3} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ==============================
  // 3. ORDERING (ORD) - Fix lỗi xóa số
  // ==============================
  if (question.question_type === "ORD") {
    // State lưu giá trị tạm thời khi đang gõ: { [itemId]: "giá_trị_đang_gõ" }
    // eslint-disable-next-line
    const [tempInputs, setTempInputs] = React.useState({});

    if (options.length === 0) {
      return <div className="text-red-500">No items to order</div>;
    }

    const currentOrderIds = currentAnswer?.order || options.map((o) => o.id);

    // 1. Hàm xử lý khi đang gõ (Cho phép xóa trắng)
    const handleInputChange = (itemId, val) => {
      setTempInputs((prev) => ({
        ...prev,
        [itemId]: val,
      }));
    };

    // 2. Hàm chốt thay đổi (Sắp xếp lại list)
    const commitChange = (itemId) => {
      const valStr = tempInputs[itemId];

      // Xóa giá trị tạm để input quay về hiển thị thứ tự chính thức
      setTempInputs((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });

      // Nếu người dùng xóa trắng hoặc không nhập gì -> Không làm gì cả (Revert)
      if (valStr === "" || valStr === undefined) return;

      const newPosition = parseInt(valStr);
      if (isNaN(newPosition)) return;

      // --- Logic Di Chuyển (Move) ---
      const newOrder = [...currentOrderIds];
      const currentIndex = newOrder.indexOf(itemId);

      if (currentIndex > -1) {
        newOrder.splice(currentIndex, 1); // Xóa khỏi vị trí cũ
      }

      // Chèn vào vị trí mới (Giới hạn trong khoảng hợp lệ)
      // Input là 1, 2, 3... -> Index là 0, 1, 2...
      const targetIndex = Math.min(
        Math.max(0, newPosition - 1),
        options.length - 1
      );
      newOrder.splice(targetIndex, 0, itemId);

      onAnswerChange(questionId, { order: newOrder });
    };

    const handleKeyDown = (e, itemId) => {
      if (e.key === "Enter") {
        e.target.blur(); // Trigger onBlur để chạy logic commitChange
      }
    };

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-center gap-2">
          <span>💡</span>
          <span>
            Enter the rank number (1, 2, 3...) then press <b>Enter</b> or click
            outside.
          </span>
        </div>

        <div className="space-y-2">
          {options.map((option) => {
            // Thứ tự thực tế hiện tại
            const realRank = currentOrderIds.indexOf(option.id) + 1;

            // Giá trị hiển thị: Ưu tiên giá trị đang gõ (temp), nếu không thì lấy rank thật
            const displayValue =
              tempInputs[option.id] !== undefined
                ? tempInputs[option.id]
                : realRank;

            return (
              <div
                key={option.id}
                className={`flex items-center gap-4 p-4 border rounded-lg bg-white transition-all ${
                  tempInputs[option.id] !== undefined
                    ? "border-blue-400 ring-2 ring-blue-100" // Highlight khi đang sửa
                    : "border-gray-200"
                }`}
              >
                {/* Ô nhập thứ tự */}
                <div className="flex flex-col items-center gap-1">
                  <Label
                    htmlFor={`ord-${option.id}`}
                    className="text-xs text-gray-500 font-semibold"
                  >
                    Order
                  </Label>
                  <Input
                    id={`ord-${option.id}`}
                    type="number" // Vẫn dùng number để hiện bàn phím số trên mobile
                    min="1"
                    max={options.length}
                    value={displayValue}
                    onChange={(e) =>
                      handleInputChange(option.id, e.target.value)
                    }
                    onBlur={() => commitChange(option.id)} // Chốt khi click ra ngoài
                    onKeyDown={(e) => handleKeyDown(e, option.id)} // Chốt khi Enter
                    className="w-16 h-10 text-center text-lg font-bold border-gray-300 focus:border-blue-500"
                  />
                </div>

                {/* Nội dung */}
                <div className="flex-1">
                  <p className="text-base text-gray-800 font-medium leading-relaxed">
                    {option.text}
                  </p>
                </div>

                {/* Badge hiển thị vị trí thực (để đối chiếu) */}
                <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-sm font-bold">
                  #{realRank}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ==============================
  // 4. FILL IN BLANK (FIB)
  // ==============================
  if (question.question_type === "FIB") {
    // Với FIB đơn giản (1 input), backend của bạn trả về correct_answer_text
    // Nếu bạn muốn hỗ trợ nhiều chỗ trống, cần cấu trúc blanks.
    // Dựa trên JSON: "correct_answer_text": "text" -> Chỉ có 1 ô input.

    return (
      <div className="space-y-3">
        <Label className="text-base text-gray-700">Your Answer:</Label>
        <Input
          placeholder="Type your answer exactly..."
          value={currentAnswer?.text || ""}
          onChange={(e) => onAnswerChange(questionId, { text: e.target.value })}
          className="max-w-xl text-lg p-6 border-gray-300 focus:border-blue-500"
        />
        <p className="text-xs text-gray-500">
          * Answers are case-insensitive but must be spelled correctly.
        </p>
      </div>
    );
  }

  return (
    <div className="text-gray-500 italic p-4 bg-gray-50 rounded-lg border border-gray-200">
      ⚠️ Unsupported question type: {question.question_type}
    </div>
  );
}
