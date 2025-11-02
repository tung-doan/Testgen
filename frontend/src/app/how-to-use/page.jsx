"use client";
import React from "react";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2 } from "lucide-react";

export default function HowToUse() {
  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200 p-4">
        <Card className="w-full max-w-4xl shadow-xl border-0 transition-transform hover:scale-[1.02]">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-semibold text-center">
              How To Use TestGen
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="create-test">Create Tests</TabsTrigger>
                <TabsTrigger value="manage-class">Manage Classes</TabsTrigger>
                <TabsTrigger value="grade-submissions">Grade Submissions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-6">
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-green-700">Welcome to TestGen!</h2>
                  <p className="text-gray-700">
                    TestGen is an all-in-one platform for creating, administering, and grading tests with automated recognition technology.
                    Follow this guide to learn how to use all the features of our platform effectively.
                  </p>
                  
                  <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                    <h3 className="text-xl font-semibold text-green-700 mb-4">Key Features</h3>
                    <ul className="space-y-3">
                      <li className="flex items-start">
                        <CheckCircle2 className="h-6 w-6 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                        <span>Create custom tests with multiple choice and single choice questions</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle2 className="h-6 w-6 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                        <span>Manage classes and students efficiently</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle2 className="h-6 w-6 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                        <span>Upload and automatically grade student submissions</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle2 className="h-6 w-6 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                        <span>View comprehensive statistics and analytics</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <h3 className="text-xl font-semibold text-blue-700 mb-4">Getting Started</h3>
                    <p className="text-gray-700 mb-4">
                      To begin using TestGen, follow these simple steps:
                    </p>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>Create your account or log in to your existing account</li>
                      <li>Set up your classes and add students</li>
                      <li>Create your first test with our intuitive test builder</li>
                      <li>Print the test for your students to complete</li>
                      <li>Upload completed tests for automatic grading</li>
                      <li>Review results and analytics</li>
                    </ol>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="create-test" className="mt-6">
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-green-700">Creating Tests</h2>
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
                    <h3 className="text-xl font-semibold text-gray-800">Step 1: Navigate to Test Creation</h3>
                    <p className="text-gray-700">
                      Click on "Quiz" in the navigation bar, then select "Create Test" button to start creating a new test.
                    </p>
                    
                    <h3 className="text-xl font-semibold text-gray-800 mt-8">Step 2: Fill in Test Details</h3>
                    <p className="text-gray-700">Enter the following information:</p>
                    <ul className="list-disc pl-5 space-y-1 text-gray-700">
                      <li>Test Name - Give your test a clear, descriptive name</li>
                      <li>Number of Questions - Set how many questions your test will have</li>
                      <li>Number of Choices - Define how many answer options per question</li>
                      <li>Question Type - Choose between single choice or multiple choice format</li>
                    </ul>
                    
                    <h3 className="text-xl font-semibold text-gray-800 mt-8">Step 3: Generate and Save</h3>
                    <p className="text-gray-700">
                      Click the "Create Test" button to generate your test. The system will create a PDF template
                      that you can download and print for your students.
                    </p>
                    
                    <h3 className="text-xl font-semibold text-gray-800 mt-8">Step 4: Provide Answer Keys</h3>
                    <p className="text-gray-700">
                      After creating a test, navigate to the test details page and click "Add Answer Key" 
                      to provide correct answers for automatic grading.
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="manage-class" className="mt-6">
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-green-700">Managing Classes</h2>
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
                    <h3 className="text-xl font-semibold text-gray-800">Creating a New Class</h3>
                    <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                      <li>Navigate to the "Class" section in the navigation bar</li>
                      <li>Click "Create Class" button</li>
                      <li>Enter class name and description</li>
                      <li>Click "Create" to save your new class</li>
                    </ol>
                    
                    <h3 className="text-xl font-semibold text-gray-800 mt-8">Adding Students to Class</h3>
                    <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                      <li>Click on a class from your list to view details</li>
                      <li>Click "Add New Student" button</li>
                      <li>Enter student details including name, student ID, and date of birth</li>
                      <li>Click "Submit" to add the student to your class</li>
                    </ol>
                    
                    <h3 className="text-xl font-semibold text-gray-800 mt-8">Managing Student Submissions</h3>
                    <p className="text-gray-700">
                      To add a submission for a student:
                    </p>
                    <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                      <li>Find the student in your class list</li>
                      <li>Click "Add Submission" button next to their name</li>
                      <li>Select the test from dropdown menu</li>
                      <li>Upload the student's completed answer sheet</li>
                      <li>Click "Upload" to process and grade the submission</li>
                    </ol>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="grade-submissions" className="mt-6">
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-green-700">Grading Submissions</h2>
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
                    <h3 className="text-xl font-semibold text-gray-800">Automatic Grading Process</h3>
                    <p className="text-gray-700 mb-4">
                      TestGen uses advanced computer vision to automatically grade submissions by following these steps:
                    </p>
                    <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                      <li>Upload a clear photo or scan of the student's completed answer sheet</li>
                      <li>Our system detects the marked answers using machine learning</li>
                      <li>The answers are compared with the predefined answer key</li>
                      <li>A score is calculated based on correct answers</li>
                      <li>Results are stored and accessible through the platform</li>
                    </ol>
                    
                    <h3 className="text-xl font-semibold text-gray-800 mt-8">Viewing Graded Submissions</h3>
                    <p className="text-gray-700">
                      To view and analyze grading results:
                    </p>
                    <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                      <li>Go to "Quiz" section and select a specific test</li>
                      <li>View the list of all submissions for that test</li>
                      <li>Click on a submission to see detailed results</li>
                      <li>You can see which questions were answered correctly/incorrectly</li>
                      <li>Export results as needed for your records</li>
                    </ol>
                    
                    <h3 className="text-xl font-semibold text-gray-800 mt-8">Tips for Best Results</h3>
                    <ul className="list-disc pl-5 space-y-2 text-gray-700">
                      <li>Ensure good lighting when taking photos of completed tests</li>
                      <li>Make sure the entire answer sheet is visible in the image</li>
                      <li>Check that student markings are clear and dark enough</li>
                      <li>If automatic grading has errors, you can manually adjust scores</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}