"use client";
import React from "react";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Mail,
  MapPin,
  PhoneCall,
  Sparkles,
  ShieldCheck,
  Users,
} from "lucide-react";

const highlights = [
  {
    title: "Create faster",
    description: "Build assessments without moving between disconnected tools.",
    icon: Sparkles,
  },
  {
    title: "Grade with less effort",
    description:
      "Scan and compare answers automatically to reduce repetitive manual work.",
    icon: ShieldCheck,
  },
  {
    title: "Stay organized",
    description:
      "Keep classes, submissions, and performance summaries in one place.",
    icon: Users,
  },
];

const contactItems = [
  {
    icon: Mail,
    label: "Email",
    value: "tung@gmail.com",
  },
  {
    icon: PhoneCall,
    label: "Phone",
    value: "+84 123 456 789",
  },
  {
    icon: MapPin,
    label: "Address",
    value:
      "268 Ly Thuong Kiet Street, District 10, Ho Chi Minh City, Vietnam",
  },
  {
    icon: Building2,
    label: "Platform",
    value: "Built for teachers, classes, and exam workflows.",
  },
];

export default function About() {
  return (
    <>
      <Header />
      <Navbar />
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#ecfdf5_100%)] px-4 py-8 text-slate-900 md:px-6 md:py-14">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* ── Hero Section ── */}
          <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="grid gap-10 px-6 py-8 md:grid-cols-[0.95fr_1.05fr] md:px-10 md:py-12">
              {/* Image Panel – light theme */}
              <div className="flex items-center justify-center">
                <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 shadow-xl shadow-emerald-900/8">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />

                  <div className="relative aspect-square overflow-hidden rounded-[22px] bg-white p-2 shadow-sm ring-1 ring-emerald-100/50">
                    <Image
                      src="/images/about-illustration.png"
                      alt="TestGen platform illustration"
                      fill
                      className="rounded-[18px] object-cover"
                      sizes="(max-width: 768px) 100vw, 420px"
                    />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
                        Mission
                      </p>
                      <p className="mt-1.5 text-sm leading-6 text-slate-700">
                        Save teachers time while keeping assessment quality
                        high.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                        Focus
                      </p>
                      <p className="mt-1.5 text-sm leading-6 text-slate-700">
                        Clear workflows, quick grading, and practical reporting.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text Content */}
              <div className="flex flex-col justify-center">
                <Badge className="mb-4 w-fit rounded-full bg-emerald-100 px-4 py-1 text-emerald-700 hover:bg-emerald-100">
                  About TestGen
                </Badge>
                <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-slate-950 md:text-5xl">
                  A focused platform for creating, scanning, and reviewing
                  assessments.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                  TestGen is built to reduce friction in the assessment process.
                  It combines test creation, printable output, automated
                  grading, and result tracking in a single interface that feels
                  more modern and easier to navigate.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {highlights.map(({ title, description, icon: Icon }) => (
                    <Card
                      key={title}
                      className="border-slate-200/80 bg-white/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <CardContent className="p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                          <Icon className="h-5 w-5" />
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
            </div>
          </section>

          {/* ── Bottom Section ── */}
          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] mt-4">
            <Card className="border-slate-200/80 bg-white/90 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl text-slate-950">
                  What TestGen is designed for
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-600">
                <p>
                  The goal is to keep the product practical for everyday
                  teaching workflows, not to overwhelm users with dense controls
                  or noisy layouts.
                </p>
                <p>
                  The visual style now matches the rest of the app more closely:
                  clean surfaces, green accent states, and enough contrast to
                  remain readable in longer sessions.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    "Assessment creation",
                    "Printable answer sheets",
                    "Computer-vision grading",
                    "Result summaries",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-[0_16px_50px_rgba(15,23,42,0.08)]">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl text-slate-950">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contactItems.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="flex items-start gap-3 rounded-2xl border border-emerald-100/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white hover:shadow-md"
                  >
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}
