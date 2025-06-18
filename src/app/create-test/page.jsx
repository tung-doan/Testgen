"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import axios from "axios";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";

export default function TestForm() {
  const [formData, setFormData] = useState({
    testName: "",
    numChoices: "",
    multipleChoice: "no",
    numQuestions: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRadioChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      multipleChoice: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        title: formData.testName,
        num_questions: parseInt(formData.numQuestions),
        num_choices: parseInt(formData.numChoices),
        allow_multiple_answers: formData.multipleChoice === "yes",
      };
      // Gửi yêu cầu POST tới API để lưu bài kiểm tra
      const response = await axios.post(
        process.env.NEXT_PUBLIC_API_URL + "api/tests/", 
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
        }
      );
  
      // Xử lý phản hồi từ API
      console.log("Test saved successfully:", response.data);
      alert("Test saved successfully!");
  
      // Bạn có thể thêm hành động sau khi lưu thành công (ví dụ: chuyển hướng, reset form,...)
      // Ví dụ: reset form
      setFormData({
        testName: "",
        numChoices: "",
        multipleChoice: "yes",
        numQuestions: "",
      });
      localStorage.setItem("newTestCreated", "true");
      window.location.href = "/quiz"; 
    } catch (error) {
      console.error("Error saving test:", error);
      let errorMessage = "Failed to save test";
      if (error.response?.data) {
        // Xử lý lỗi từ backend
        const text = await new Response(error.response.data).text();
        errorMessage = JSON.parse(text)?.error || text;
      } else {
        errorMessage = error.message;
      }
      alert("Error saving test: " + errorMessage);
    }
  };  


  const handlePreview = async () => {
    try {
      const response = await axios.post(
        process.env.NEXT_PUBLIC_API_URL + "api/tests/preview_test_pdf/",
        formData,
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true,
          responseType: "blob",
        }
      );

      console.log("Response headers:", response.headers);
      console.log("Response data type:", response.data.type);

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error details:", error);
      let errorMessage = "Failed to generate PDF";
      if (error.response?.data) {
        // Handle JSON errors
        const text = await new Response(error.response.data).text();
        errorMessage = JSON.parse(text)?.error || text;
      } else {
        errorMessage = error.message;
      }
      alert("Error generating PDF preview: " + errorMessage);
    }
  };

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200 p-4">
        <Card className="w-full max-w-lg shadow-xl border-0 transition-transform hover:scale-[1.02]">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-semibold text-center">
              Create Your Test
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form className="space-y-6">
              <div>
                <Label
                  htmlFor="testName"
                  className="text-sm font-medium text-gray-700"
                >
                  Name of the Test
                </Label>
                <Input
                  id="testName"
                  name="testName"
                  value={formData.testName}
                  onChange={handleInputChange}
                  placeholder="e.g., Math Quiz 2025"
                  className="mt-1 border-gray-300 focus:border-green-500 focus:ring-green-500 transition-colors duration-200"
                />
              </div>

              <div>
                <Label
                  htmlFor="numChoices"
                  className="text-sm font-medium text-gray-700"
                >
                  Number of Choices
                </Label>
                <Input
                  id="numChoices"
                  name="numChoices"
                  type="number"
                  min="1"
                  value={formData.numChoices}
                  onChange={handleInputChange}
                  placeholder="e.g., 4"
                  className="mt-1 border-gray-300 focus:border-green-500 focus:ring-green-500 transition-colors duration-200"
                />
              </div>

              {/* <div>
                <Label className="text-sm font-medium text-gray-700">
                  Multiple Choice Answer
                </Label>
                <RadioGroup
                  value={formData.multipleChoice}
                  onValueChange={handleRadioChange}
                  className="mt-2 flex space-x-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="yes"
                      id="yes"
                      className="text-green-600"
                    />
                    <Label
                      htmlFor="yes"
                      className="text-gray-600 cursor-pointer"
                    >
                      Yes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="no"
                      id="no"
                      className="text-green-600"
                    />
                    <Label
                      htmlFor="no"
                      className="text-gray-600 cursor-pointer"
                    >
                      No
                    </Label>
                  </div>
                </RadioGroup>
              </div> */}

              <div>
                <Label
                  htmlFor="numQuestions"
                  className="text-sm font-medium text-gray-700"
                >
                  Number of Questions
                </Label>
                <Input
                  id="numQuestions"
                  name="numQuestions"
                  type="number"
                  min="1"
                  value={formData.numQuestions}
                  onChange={handleInputChange}
                  placeholder="e.g., 10"
                  className="mt-1 border-gray-300 focus:border-green-500 focus:ring-green-500 transition-colors duration-200"
                />
              </div>

              <div className="flex space-x-4 mt-8">
                <Button
                  type="button"
                  onClick={handlePreview}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition-colors duration-200"
                >
                  Preview Form
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 bg-gray-700 hover:bg-gray-800 text-white font-medium py-2 rounded-lg transition-colors duration-200"
                >
                  Save Test
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
