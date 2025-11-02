'use client';
import Image from "next/image";
import Header from "@/components/Header";
import TitleArea from "@/components/Title";
import CardFrame from "@/components/Card";
import { Button } from "@/components/ui/button";
import { useContext } from "react";
import { AuthContext } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";

export default function Home() {
  const user = useContext(AuthContext);
  const task1 = [ "Support for multiple-choice and short-answer questions",
    "Customizable number of questions and time limits",
    "Question bank for easy reuse"];
  const header1 = "Test Creation";
  const task2 = ["Export to PDF or other printable formats",
      "Well-designed answer sheets for easy scanning and grading",
      "Print directly from the platform"    
    ]
  const header2 = "Export & Print";
  const task3 = ["Use Computer Vision to scan and recognize answers",
 "Automatically compare responses with the answer key",
 "Detect invalid responses (e.g., incorrectly marked answers)"]
  const header3 = "AI-Powered";
  const task4 = ["Store student test results securely",
"Generate reports with performance analysis by class/student",
 "Send results via email or display them directly"]
  const header4 = "Results Management";
  return (
    <>
    <Header />
    {user.isAuthenticated && (
      <Navbar />
    )}
    <TitleArea />
    <div className="w-full h-[657px] flex justify-center items-center">
      <div className="w-[1152px] h-[527px] grid grid-cols-3 items-center justify-center gap-10 mt-10">
      <CardFrame Features={task1} header={header1} decor={false} ></CardFrame>
      <CardFrame Features={task2} header={header2} ></CardFrame>
      <CardFrame Features={task3} header={header3} ></CardFrame>
      <div className="col-span-3 flex justify-center items-center mt-10 -ml-20">
      <CardFrame Features={task4} header={header4} decor={true} ></CardFrame>   
      </div>
      </div>
    </div>
    </>
  );
}
