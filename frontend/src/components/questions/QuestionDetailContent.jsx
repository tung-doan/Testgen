"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";
import Image from "next/image";

const typeColorMap = {
  MULTIPLE_CHOICE: "bg-blue-100 text-blue-800",
  TRUE_FALSE: "bg-green-100 text-green-800",
  ORDERING: "bg-purple-100 text-purple-800",
  FILL_BLANK: "bg-yellow-100 text-yellow-800",
  MC: "bg-blue-100 text-blue-800",
  TFE: "bg-green-100 text-green-800",
  ORD: "bg-purple-100 text-purple-800",
  FIB: "bg-orange-100 text-orange-800",
};

function normalizeType(type) {
  if (["MC", "MULTIPLE_CHOICE"].includes(type)) return "MC";
  if (["TFE", "TRUE_FALSE"].includes(type)) return "TFE";
  if (["ORD", "ORDERING"].includes(type)) return "ORD";
  if (["FIB", "FILL_BLANK"].includes(type)) return "FIB";
  return type || "";
}

function resolveOptions(question) {
  return question?.answer_options || question?.options || [];
}

function getTypeColor(type) {
  const normalizedType = normalizeType(type);
  return typeColorMap[normalizedType] || "bg-gray-100 text-gray-800";
}

export default function QuestionDetailContent({ question }) {
  if (!question) return null;

  const normalizedType = normalizeType(question.question_type);
  const options = resolveOptions(question);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Question:</h3>
        <p className="text-gray-700">{question.prompt}</p>
      </div>

      {question.image && (
        <div>
          <h3 className="font-semibold mb-2">Image:</h3>
          <div className="relative w-full max-w-2xl rounded overflow-hidden border border-gray-200">
            <img
              src={question.image}
              alt="Question Image"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      )}

      {normalizedType === "FIB" ? (
        <div>
          <h3 className="font-semibold mb-2">Correct Answer:</h3>
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-lg font-medium text-green-800">
                {question.correct_answer_text || "No answer provided"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="font-semibold mb-2">Answer Options:</h3>
          <div className="space-y-2">
            {options.length > 0 ? (
              options.map((option, index) => {
                const isCorrect =
                  option.is_correct_bool === true ||
                  (option.score_percentage || 0) > 0 ||
                  option.correct_order !== null;

                return (
                  <div
                    key={option.id || index}
                    className={`flex items-start gap-2 p-3 border rounded ${
                      isCorrect
                        ? "bg-green-50 border-green-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <span className="font-bold min-w-[30px]">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <span className="flex-1">{option.text}</span>

                    {normalizedType === "ORD" &&
                    option.correct_order !== null ? (
                      <Badge className="bg-purple-100 text-purple-800">
                        Position: {option.correct_order}
                      </Badge>
                    ) : normalizedType === "TFE" ? (
                      option.is_correct_bool === true ? (
                        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          True
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                          <XCircle className="h-4 w-4" />
                          False
                        </Badge>
                      )
                    ) : isCorrect ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        {(option.score_percentage || 0) > 0 && (
                          <Badge className="bg-green-100 text-green-800">
                            {option.score_percentage}%
                          </Badge>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500 text-sm">No options available</p>
            )}
          </div>
        </div>
      )}

      {question.explanation && (
        <div>
          <h3 className="font-semibold mb-2">Explanation:</h3>
          <p className="text-gray-700 bg-blue-50 p-3 rounded border border-blue-200">
            {question.explanation}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div>
          <span className="text-sm text-gray-600 block mb-1">Type:</span>
          <Badge className={getTypeColor(question.question_type)}>
            {question.question_type_display}
          </Badge>
        </div>
      </div>

      {normalizedType === "TFE" && (
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> This is a True/False Extended question. Each
            statement can be marked as True or False.
          </p>
        </div>
      )}

      {normalizedType === "ORD" && (
        <div className="bg-purple-50 p-3 rounded border border-purple-200">
          <p className="text-sm text-purple-800">
            <strong>Note:</strong> This is an Ordering question. Students must
            arrange options in the correct sequence.
          </p>
        </div>
      )}
    </div>
  );
}
