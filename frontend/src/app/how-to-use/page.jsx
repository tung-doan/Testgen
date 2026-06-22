"use client";
import React from "react";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";

const quickSteps = [
  {
    title: "Set up your class",
    description:
      "Create classes, add students, and keep the roster ready before building tests.",
    icon: LayoutDashboard,
    step: "01",
  },
  {
    title: "Create the exam",
    description:
      "Choose the test type, configure questions, and generate the paper or online version.",
    icon: ClipboardList,
    step: "02",
  },
  {
    title: "Review results",
    description:
      "Upload submissions, scan them, and inspect scores and analytics in one flow.",
    icon: BookOpen,
    step: "03",
  },
];

export default function HowToUse() {
  return (
    <>
      <Header />
      <Navbar />
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#ecfdf5_100%)] px-4 py-8 text-slate-900 md:px-6 md:py-14">
        <div className="mx-auto max-w-6xl space-y-8">
          {/* ── Hero Section ── */}
          <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="px-6 py-8 md:px-10 md:py-12">
              <Badge className="mb-4 w-fit rounded-full bg-emerald-100 px-4 py-1 text-emerald-700 hover:bg-emerald-100">
                How to use
              </Badge>
              <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-slate-950 md:text-5xl">
                A quick guide to creating tests, managing classes, and grading
                results.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
                The flow below keeps the product approachable. Start with the
                basics, then move into the part you need.
              </p>

              {/* Quick Steps – connected design */}
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {quickSteps.map(({ title, description, icon: Icon, step }, i) => (
                  <Card
                    key={title}
                    className="group relative border-slate-200/80 bg-white/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {/* Top accent bar */}
                    <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-gradient-to-r from-emerald-400 to-teal-400 opacity-60 transition-opacity group-hover:opacity-100" />

                    <CardContent className="p-5 pt-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                          Step {step}
                        </span>
                      </div>
                      <h2 className="mt-4 text-lg font-semibold text-slate-950">
                        {title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* ── Tabs Section ── */}
          <Card className="border-slate-200/80 bg-white/90 shadow-[0_16px_50px_rgba(15,23,42,0.08)] mt-4">
            <CardContent className="p-4 md:p-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-2 md:grid-cols-4">
                  <TabsTrigger
                    value="overview"
                    className="rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-950"
                  >
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="create-test"
                    className="rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-950"
                  >
                    Create Tests
                  </TabsTrigger>
                  <TabsTrigger
                    value="manage-class"
                    className="rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-950"
                  >
                    Manage Classes
                  </TabsTrigger>
                  <TabsTrigger
                    value="grade-submissions"
                    className="rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-950"
                  >
                    Grade Submissions
                  </TabsTrigger>
                </TabsList>

                {/* ── Overview Tab ── */}
                <TabsContent value="overview" className="mt-6">
                  <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
                    {/* Welcome card – light emerald theme */}
                    <Card className="border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-2xl text-slate-950">
                          Welcome to TestGen
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 text-slate-700">
                        <p>
                          TestGen is an all-in-one platform for creating,
                          administering, and grading tests with automated
                          recognition technology.
                        </p>
                        <p>
                          Follow this guide to learn the flow that matches the
                          updated interface.
                        </p>
                        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200/60 bg-emerald-100/50 px-4 py-3 text-sm text-emerald-800">
                          <Sparkles className="h-4 w-4 text-emerald-600" />
                          The interface is designed to keep the most common
                          actions easy to find.
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-4">
                      <Card className="border-slate-200/80 bg-white">
                        <CardContent className="p-5">
                          <h3 className="text-lg font-semibold text-slate-950">
                            Key features
                          </h3>
                          <ul className="mt-4 space-y-3">
                            {[
                              "Create custom tests with multiple choice and single choice questions",
                              "Manage classes and students efficiently",
                              "Upload and automatically grade student submissions",
                              "View statistics and analytics in one place",
                            ].map((item) => (
                              <li
                                key={item}
                                className="flex items-start gap-3 text-sm text-slate-600"
                              >
                                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card className="border-slate-200/80 bg-white">
                        <CardContent className="p-5">
                          <h3 className="text-lg font-semibold text-slate-950">
                            Getting started
                          </h3>
                          <ol className="mt-4 space-y-3 text-sm text-slate-600">
                            {[
                              "Create your account or log in",
                              "Set up classes and add students",
                              "Build your first test",
                              "Print or share the test",
                              "Upload completed sheets for grading",
                              "Review results and analytics",
                            ].map((item, index) => (
                              <li key={item} className="flex gap-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                                  {index + 1}
                                </span>
                                <span className="pt-0.5">{item}</span>
                              </li>
                            ))}
                          </ol>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                {/* ── Create Tests Tab ── */}
                <TabsContent value="create-test" className="mt-6">
                  <Card className="border-slate-200/80 bg-white/95">
                    <CardContent className="p-6 md:p-7">
                      <h2 className="text-2xl font-semibold text-slate-950">
                        Creating tests
                      </h2>
                      <div className="mt-6 space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            Step 1: Navigate to test creation
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Open the Quiz area, then choose the Create Test
                            action to start a new exam.
                          </p>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            Step 2: Fill in test details
                          </h3>
                          <ul className="mt-3 grid gap-2 text-sm text-slate-600">
                            {[
                              "Test name - use a clear descriptive title",
                              "Number of questions - choose the length of the test",
                              "Number of choices - define the number of answer options",
                              "Question type - select single or multiple choice",
                            ].map((item) => (
                              <li
                                key={item}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                              >
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            Step 3: Generate and save
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Generate the PDF template, download it, and print it
                            for your students.
                          </p>
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">
                            Step 4: Provide answer keys
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            Add the answer key from the test details page so
                            submissions can be graded automatically.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Manage Classes Tab ── */}
                <TabsContent value="manage-class" className="mt-6">
                  <Card className="border-slate-200/80 bg-white/95">
                    <CardContent className="p-6 md:p-7">
                      <h2 className="text-2xl font-semibold text-slate-950">
                        Managing classes
                      </h2>
                      <div className="mt-6 grid gap-6 lg:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                          <h3 className="text-lg font-semibold text-slate-900">
                            Create a class
                          </h3>
                          <ol className="mt-4 space-y-2 text-sm text-slate-600">
                            {[
                              'Go to the "Class" section',
                              'Click "Create Class"',
                              "Enter the class name and description",
                              "Save the new class",
                            ].map((item, index) => (
                              <li key={item} className="flex gap-2">
                                <span className="font-semibold text-emerald-600">
                                  {index + 1}.
                                </span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                          <h3 className="text-lg font-semibold text-slate-900">
                            Add students
                          </h3>
                          <ol className="mt-4 space-y-2 text-sm text-slate-600">
                            {[
                              "Open a class from your list",
                              'Click "Add New Student"',
                              "Enter student information",
                              "Submit to add them to the class",
                            ].map((item, index) => (
                              <li key={item} className="flex gap-2">
                                <span className="font-semibold text-emerald-600">
                                  {index + 1}.
                                </span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                          <h3 className="text-lg font-semibold text-slate-900">
                            Manage submissions
                          </h3>
                          <ol className="mt-4 space-y-2 text-sm text-slate-600">
                            {[
                              "Find the student in the class list",
                              'Choose "Add Submission"',
                              "Select the test and upload the sheet",
                              "Process and grade the submission",
                            ].map((item, index) => (
                              <li key={item} className="flex gap-2">
                                <span className="font-semibold text-emerald-600">
                                  {index + 1}.
                                </span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Grade Submissions Tab ── */}
                <TabsContent value="grade-submissions" className="mt-6">
                  <Card className="border-slate-200/80 bg-white/95">
                    <CardContent className="p-6 md:p-7">
                      <h2 className="text-2xl font-semibold text-slate-950">
                        Grading submissions
                      </h2>
                      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                        <div className="space-y-5">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              Automatic grading process
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              TestGen uses computer vision to automatically
                              grade submissions through a short, predictable
                              flow.
                            </p>
                          </div>

                          <ol className="space-y-3 text-sm text-slate-600">
                            {[
                              "Upload a clear photo or scan of the completed sheet",
                              "The system detects the marked answers",
                              "Responses are compared with the answer key",
                              "A score is calculated and stored",
                              "Results remain available for later review",
                            ].map((item, index) => (
                              <li
                                key={item}
                                className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                              >
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                                  {index + 1}
                                </span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Viewing graded submissions – light emerald theme */}
                        <div className="space-y-5 rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              Viewing graded submissions
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              Go to Quiz, open a test, and inspect the
                              submissions to see question-level results.
                            </p>
                          </div>

                          <ol className="space-y-2 text-sm text-slate-700">
                            {[
                              "Open the test from the Quiz section",
                              "Review all submissions for that test",
                              "Open a submission for detailed results",
                              "Check correct and incorrect answers",
                              "Export results if needed",
                            ].map((item, index) => (
                              <li key={item} className="flex gap-2">
                                <span className="font-semibold text-emerald-600">
                                  {index + 1}.
                                </span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ol>

                          <div className="rounded-2xl border border-emerald-200/60 bg-emerald-100/50 p-4 text-sm text-emerald-800">
                            Good photos and clear marks still matter. If grading
                            looks off, double-check lighting and sheet
                            alignment.
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <h3 className="text-lg font-semibold text-slate-900">
                          Tips for best results
                        </h3>
                        <ul className="mt-4 grid gap-3 md:grid-cols-2">
                          {[
                            "Use good lighting when taking photos of completed tests",
                            "Keep the entire answer sheet visible in the frame",
                            "Make sure markings are dark and clear",
                            "Adjust scores manually when necessary",
                          ].map((item) => (
                            <li
                              key={item}
                              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
                            >
                              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
