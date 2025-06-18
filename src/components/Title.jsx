import { Button } from "@/components/ui/button";
import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function TitleArea() {
  return (
    <section className="w-full py-10 bg-white ">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-8 max-w-6xl mx-auto">
        <div className="flex flex-col space-y-6 max-w-xl gap-10">
          <h1 className="font-h1 text-[#505050] text-[64px] leading-[79px]">
            From Questions to Knowledge.
          </h1>

          <p className="font-text text-[#191919] text-[24px] leading-[29px]">
            A powerful platform for creating and grading exams effortlessly.
            Generate customized multiple-choice or short-answer tests, print
            them for students, and use AI-powered to scan and grade responses
            automatically. Simplify assessments and focus on what
            matters—teaching!
          </p>

          <Link href="/register">
          <Button className="w-fit text-2xl font-normal text-black bg-[#00d663] hover:bg-[#212221] hover:text-[#00BE06] rounded-lg shadow-md px-6 py-4 h-auto transition-colors duration-300 ease-in-out cursor-pointer">
            Sign up for free
          </Button>
          </Link>
        </div>

        <div className="flex-shrink-0">
          {/* <img
            className="w-full max-w-[539px] h-auto object-cover"
            alt="Students discussing with speech bubbles"
            src="/images/spot-3-copy.png"
          /> */}
          <Image src={"/images/spot-3-copy.png"}
            alt = "Students discussing with speech bubbles"
            width = {539}
            height={382}
            className="w-full max-w-[539px] h-auto object-cover"
          ></Image>
        </div>
      </div>
    </section>
  );
}
