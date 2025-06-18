"use client";
import React from "react";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

export default function About() {
  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200 p-4">
        <Card className="w-full max-w-4xl shadow-xl border-0 transition-transform hover:scale-[1.02]">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-semibold text-center">
              About TestGen
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
              <div className="md:w-1/3 flex justify-center">
                <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-green-500">
                  <Image 
                    src="/images/test.png" 
                    alt="TestGen Logo" 
                    fill 
                    style={{ objectFit: "cover" }} 
                  />
                </div>
              </div>
              <div className="md:w-2/3">
                <h2 className="text-2xl font-bold text-green-700 mb-4">Our Mission</h2>
                <p className="text-gray-700 mb-4">
                  TestGen is an advanced online testing platform designed to revolutionize the way educators create, administer, and grade assessments. 
                  Our mission is to provide a simple yet powerful tool that saves time for teachers while providing accurate and timely feedback to students.
                </p>
                <p className="text-gray-700">
                  With our automated grading system powered by computer vision technology, we aim to reduce the workload on educators 
                  while maintaining high standards of assessment accuracy and data analysis.
                </p>
              </div>
            </div>

        

            <div className="mt-12">
              <h2 className="text-2xl font-bold text-green-700 mb-6">Contact Us</h2>
              <p className="text-gray-700 mb-2">
                <span className="font-semibold">Email:</span> tung@gmail.com
              </p>
              <p className="text-gray-700 mb-2">
                <span className="font-semibold">Phone:</span> +84 123 456 789
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Address:</span> 268 Ly Thuong Kiet Street, District 10, Ho Chi Minh City, Vietnam
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}