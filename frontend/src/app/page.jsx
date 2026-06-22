"use client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useContext } from "react";
import { AuthContext } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BarChart3,
  FileText,
  Printer,
  ScanSearch,
  Sparkles,
} from "lucide-react";

const featureCards = [
  {
    title: "Test Creation",
    icon: FileText,
    accent: "from-emerald-500 to-teal-600",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    description:
      "Create multiple-choice and short-answer exams with reusable question banks and flexible timing.",
    points: [
      "Reusable question sets",
      "Flexible time limits",
      "Simple test builder",
    ],
  },
  {
    title: "Export & Print",
    icon: Printer,
    accent: "from-slate-500 to-slate-700",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    description:
      "Generate clean PDF sheets that are easy to print, distribute, and scan in the classroom.",
    points: ["Print-ready layouts", "PDF export", "Answer sheet support"],
  },
  {
    title: "AI-Powered",
    icon: ScanSearch,
    accent: "from-teal-500 to-cyan-600",
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    description:
      "Scan student answers and compare them with the answer key to speed up grading.",
    points: [
      "Computer vision scan",
      "Automatic comparison",
      "Invalid-mark detection",
    ],
  },
  {
    title: "Results Management",
    icon: BarChart3,
    accent: "from-emerald-500 to-lime-500",
    iconBg: "bg-lime-50",
    iconColor: "text-lime-600",
    description:
      "Store results securely and review performance by class or student with clear reporting.",
    points: [
      "Secure storage",
      "Performance reports",
      "Email or in-app results",
    ],
  },
];

export default function Home() {
  const user = useContext(AuthContext);

  return (
    <>
      <Header />
      {user?.isAuthenticated && <Navbar />}

      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_34%),linear-gradient(180deg,#f8fafc_0%,#ecfdf5_100%)] text-slate-900">
        {/* ── Hero Section ── */}
        <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-14">
          <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-white/75 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="absolute -left-16 top-0 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="absolute right-0 top-20 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />

            <div className="relative grid gap-10 px-6 py-8 md:grid-cols-[1.08fr_0.92fr] md:px-10 md:py-12">
              <div className="flex flex-col justify-center">
                <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                  <Sparkles className="h-4 w-4" />
                  Smarter assessment workflow
                </div>

                <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-slate-950 md:text-6xl">
                  From questions to grading, all in one calm, modern workspace.
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                  TestGen helps teachers create tests, print answer sheets, scan
                  submissions, and review results without the usual friction.
                  The interface stays fast, clear, and practical on both desktop
                  and mobile.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button
                    asChild
                    className="h-12 rounded-full bg-emerald-500 px-6 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-transform hover:-translate-y-0.5 hover:bg-emerald-600"
                  >
                    <Link href={user?.isAuthenticated ? "/quiz" : "/register"}>
                      {user?.isAuthenticated
                        ? "Open dashboard"
                        : "Get started free"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-12 rounded-full border-slate-300 bg-white/80 px-6 text-base font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Link href="/how-to-use">How it works</Link>
                  </Button>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {[
                    ["Create", "Build printable or online tests"],
                    ["Scan", "Read answer sheets automatically"],
                    ["Report", "Review results in seconds"],
                  ].map(([title, description]) => (
                    <div
                      key={title}
                      className="rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-sm"
                    >
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
                        {title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Hero Visual Panel ── */}
              <div className="flex items-center justify-center">
                <div className="relative w-full max-w-xl overflow-hidden rounded-[28px] border border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 shadow-xl shadow-emerald-900/8">
                  <div className="absolute inset-x-0 top-0 h-1 rounded-t-[28px] bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />

                  {/* Main Image */}
                  <div className="overflow-hidden rounded-[20px] bg-white p-3 shadow-sm ring-1 ring-emerald-100/50">
                    <Image
                      src="/images/hero-education.png"
                      alt="Teachers collaborating on assessments"
                      width={539}
                      height={382}
                      className="h-full w-full rounded-[16px] object-cover"
                      priority
                    />
                  </div>

                  {/* Info Cards below the image */}
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-100 bg-white/90 p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
                        One flow
                      </p>
                      <p className="mt-1.5 text-sm font-medium leading-snug text-slate-800">
                        Create, print, grade, and review.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-teal-100 bg-white/90 p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wider text-teal-500">
                        Built for speed
                      </p>
                      <p className="mt-1.5 text-sm leading-snug text-slate-600">
                        Reduce repetitive work with cleaner processes.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                        Trusted
                      </p>
                      <p className="mt-1.5 text-sm leading-snug text-slate-600">
                        Polished, readable, and classroom ready.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Feature Cards Section ── */}
        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6">
          <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-600">
                Key capabilities
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950 md:text-3xl">
                Everything needed to run assessments end to end
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-right md:text-base">
              The core features stay visible and approachable, so new users can
              understand the product quickly.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {featureCards.map((card) => {
              const Icon = card.icon;

              return (
                <Card
                  key={card.title}
                  className="group relative overflow-hidden border-slate-200/80 bg-white/90 shadow-[0_16px_50px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(15,23,42,0.12)]"
                >
                  {/* Accent top bar */}
                  <div
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accent} opacity-80 transition-opacity group-hover:opacity-100`}
                  />

                  <CardContent className="p-6 pt-7 md:p-7 md:pt-8">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${card.iconBg} ${card.iconColor} shadow-sm ring-1 ring-slate-100`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-semibold text-slate-950">
                          {card.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {card.description}
                        </p>

                        <ul className="mt-5 grid gap-2 sm:grid-cols-3">
                          {card.points.map((point) => (
                            <li
                              key={point}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                            >
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
