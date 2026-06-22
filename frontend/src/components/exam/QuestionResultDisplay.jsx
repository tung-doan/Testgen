import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Info, HelpCircle } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function QuestionResultDisplay({ answer, index }) {
  const { question, answer_data: studentAnswer, score } = answer;
  const options = question.answer_options || [];

  const renderMC = () => {
    const selectedOptions = studentAnswer?.selected_options || [];
    const isMultiple = question.allow_multiple_answers;

    return (
      <div className="space-y-3">
        {options.map((option, idx) => { 
          const isSelected = selectedOptions.includes(option.id);
          const isCorrect = option.is_correct_bool;
          
          let borderColor = "border-gray-200";
          let bgColor = "bg-white";
          
          if (isSelected && isCorrect) {
            borderColor = "border-green-500";
            bgColor = "bg-green-50";
          } else if (isSelected && !isCorrect) {
            borderColor = "border-red-500";
            bgColor = "bg-red-50";
          } else if (!isSelected && isCorrect) {
            borderColor = "border-green-300";
            bgColor = "bg-green-50/30";
          }

          return (
            <div
              key={option.id}
              className={`flex items-center p-3 border rounded-lg transition-colors mb-2 ${borderColor} ${bgColor}`}
            >
              <div className="flex items-center justify-center w-6 h-6 mr-3">
                {isSelected ? (
                  isCorrect ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <X className="h-5 w-5 text-red-600" />
                  )
                ) : isCorrect ? (
                  <Check className="h-4 w-4 text-green-400 opacity-70" />
                ) : (
                  <div className={`w-4 h-4 rounded-full border ${isMultiple ? "rounded-sm" : ""}`} />
                )}
              </div>  
              <Label className="flex-1 text-base">
                <span className="font-semibold mr-2">
                  {String.fromCharCode(65 + idx)}.
                </span>
                {option.text}
              </Label>
              {isCorrect && (
                <Badge variant="outline" className="ml-2 border-green-200 text-green-700 bg-green-50">
                  Correct Answer
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTFE = () => {
    const studentResponses = studentAnswer?.answers || [];
    
    return (
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm mb-2">
        <div className="grid grid-cols-12 bg-gray-100 p-3 font-semibold text-sm text-gray-700 border-b">
          <div className="col-span-6">Statement</div>
          <div className="col-span-3 text-center">Your Answer</div>
          <div className="col-span-3 text-center">Correct Answer</div>
        </div>
        <div className="divide-y">
          {options.map((opt, idx) => {
            const studentVal = studentResponses[idx];
            const correctVal = opt.is_correct_bool;
            const isRight = studentVal === correctVal;

            return (
              <div key={opt.id} className="grid grid-cols-12 items-center p-4 hover:bg-gray-50 transition-colors">
                <div className="col-span-6 pr-4 text-base text-gray-800">
                  <span className="font-bold mr-2 text-gray-400">{idx + 1}.</span>
                  {opt.text}
                </div>
                <div className="col-span-3 flex justify-center">
                  {studentVal === null || studentVal === undefined ? (
                    <span className="text-gray-400 italic text-sm">No answer</span>
                  ) : (
                    <div className={`flex items-center gap-1 ${isRight ? "text-green-600" : "text-red-600"}`}>
                      {studentVal ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                      <span className="font-medium">{studentVal ? "True" : "False"}</span>
                    </div>
                  )}
                </div>
                <div className="col-span-3 flex justify-center">
                  <div className="flex items-center gap-1 text-green-700 font-bold">
                    {correctVal ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                    <span>{correctVal ? "True" : "False"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderORD = () => {
    // Backend returns options in their original order.
    // studentAnswer.order is an array of option IDs in the order student chose.
    const studentOrderIds = studentAnswer?.order || [];
    
    // Create a map for quick access
    const optionsMap = {};
    options.forEach(o => optionsMap[o.id] = o);

    // If student didn't answer, show original options but with correct ranks
    const displayIds = studentOrderIds.length > 0 ? studentOrderIds : options.map(o => o.id);

    return (
      <div className="space-y-2 mb-2">
        <div className="bg-blue-50 border border-blue-100 rounded p-2 text-xs text-blue-700 mb-2">
            Items shown in your submitted order.
        </div>
        {displayIds.map((id, idx) => {
          const option = optionsMap[id];
          if (!option) return null;
          
          const studentRank = idx + 1;
          const correctRank = option.correct_order;
          const isRight = studentRank === correctRank;

          return (
            <div key={id} className={`flex items-center gap-4 p-3 border rounded-lg ${isRight ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"}`}>
               <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${isRight ? "bg-green-600 text-white" : "bg-red-500 text-white"}`}>
                  {studentRank}
               </div>
               <div className="flex-1 text-base font-medium">
                  {option.text}
               </div>
               <div className="text-right">
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Correct Rank</p>
                  <p className="text-lg font-black text-green-700">#{correctRank}</p>
               </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderFIB = () => {
    const studentText = studentAnswer?.text || "";
    const correctText = question.correct_answer_text || "";
    const isRight = studentText.trim().toLowerCase() === correctText.trim().toLowerCase();

    return (
      <div className="space-y-4">
        <div className={`p-4 rounded-lg border ${isRight ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <p className="text-sm font-semibold text-gray-500 mb-1">Your Answer:</p>
            <p className={`text-xl font-bold ${isRight ? "text-green-700" : "text-red-700"}`}>
                {studentText || <span className="italic font-normal opacity-50">No answer provided</span>}
            </p>
        </div>
        {!isRight && (
           <div className="p-4 rounded-lg border border-green-200 bg-green-50">
                <p className="text-sm font-semibold text-green-600 mb-1">Correct Answer:</p>
                <p className="text-xl font-bold text-green-800">{correctText}</p>
           </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-md overflow-hidden bg-white mb-6 !p-0">
      <CardHeader className="bg-gray-50 border-b p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 p-2">
            <div className="flex items-center justify-center min-w-[2.5rem] h-10 rounded-full bg-blue-100 text-blue-700 font-bold">
              {index + 1}
            </div>
            <div>
              <CardTitle className="text-lg font-bold leading-tight">
                {question.prompt}
              </CardTitle>
              {question.image && (
                <div className="relative w-full max-w-xl rounded overflow-hidden border border-gray-200 mt-3 mb-1">
                  <img
                    src={question.image}
                    alt="Question Image"
                    className="w-full h-auto object-contain"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px] py-0">
                  {question.question_type_display}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right pr-4 pt-4">
             <p className="text-[10px] font-bold text-gray-400 uppercase">Score</p>
             <div className={`text-xl font-black ${score > 0 ? "text-green-600" : "text-red-500"}` }>
                {score.toFixed(1)}
             </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {question.question_type === "MC" && renderMC()}
        {question.question_type === "TFE" && renderTFE()}
        {question.question_type === "ORD" && renderORD()}
        {question.question_type === "FIB" && renderFIB()}
      </CardContent>
    </Card>
  );
}
