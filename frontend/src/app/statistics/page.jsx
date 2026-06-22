"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { useStatistics } from "@/hooks/useStatistics";
import { Trophy, ChevronDown, GraduationCap, BookOpen } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

// ── Skeleton ──
function SkeletonChart() {
  return (
    <div className="rounded-2xl p-6 bg-white/60 animate-pulse">
      <div className="h-5 w-40 bg-gray-200 rounded mb-6" />
      <div className="h-[300px] bg-gray-100 rounded-lg" />
    </div>
  );
}

// ── Chart defaults ──
const baseBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top",
      labels: { usePointStyle: true, padding: 20, font: { size: 13 } },
    },
    tooltip: {
      backgroundColor: "rgba(15,23,42,0.9)",
      padding: 14,
      titleFont: { size: 14, weight: "bold" },
      bodyFont: { size: 13 },
      cornerRadius: 10,
      displayColors: true,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: "rgba(0,0,0,0.04)" },
      ticks: { font: { size: 12 }, color: "#64748b" },
    },
    x: {
      grid: { display: false },
      ticks: {
        font: { size: 11 },
        color: "#64748b",
        maxRotation: 45,
        minRotation: 0,
      },
    },
  },
};

// ── Medal colors ──
const medalColors = [
  "from-yellow-400 to-amber-500",
  "from-gray-300 to-gray-400",
  "from-orange-400 to-orange-600",
];

export default function Statistic() {
  const { getDashboardStats, loading, error } = useStatistics();
  const [data, setData] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState("all");

  useEffect(() => {
    getDashboardStats()
      .then(setData)
      .catch((e) => console.error("Dashboard fetch error:", e));
  }, []);

  // ── Chart: Class Averages ──
  const classChartData = useMemo(() => {
    if (!data?.class_averages?.length) return null;

    const labels = [];
    const values = [];
    const bgColors = [];
    const borderColors = [];
    const types = []; // store type for tooltip
    
    data.class_averages.forEach(c => {
      const paperScore = c.avg_score_paper || 0;
      const onlineScore = c.avg_score_online || 0;
      const hasPaper = paperScore > 0;
      const hasOnline = onlineScore > 0;
      
      if (hasPaper) {
        labels.push(hasOnline ? `${c.class_name} (Paper)` : c.class_name);
        values.push(paperScore);
        bgColors.push("rgba(99,102,241,0.7)"); // Purple
        borderColors.push("rgba(99,102,241,1)");
        types.push("Paper");
      }
      
      if (hasOnline) {
        labels.push(hasPaper ? `${c.class_name} (Online)` : c.class_name);
        values.push(onlineScore);
        bgColors.push("rgba(16,185,129,0.7)"); // Green
        borderColors.push("rgba(16,185,129,1)");
        types.push("Online");
      }
    });

    if (values.length === 0) {
      return {
        labels: data.class_averages.map(c => c.class_name),
        datasets: [{
          label: "No Test Data",
          data: data.class_averages.map(() => 0),
          backgroundColor: "rgba(203,213,225,0.5)",
          borderColor: "rgba(203,213,225,1)",
          borderWidth: 2,
          borderRadius: 6,
          maxBarThickness: 45,
        }],
        meta: []
      };
    }

    return {
      labels,
      datasets: [
        {
          label: "Average Score",
          data: values,
          backgroundColor: bgColors,
          borderColor: borderColors,
          borderWidth: 2,
          borderRadius: 6,
          maxBarThickness: 45,
        }
      ],
      meta: types
    };
  }, [data]);

  // ── Chart: Test Averages ──
  const testChartData = useMemo(() => {
    if (!data?.test_averages?.length) return null;
    const sorted = [...data.test_averages].sort(
      (a, b) => b.average_score - a.average_score,
    );
    return {
      labels: sorted.map((t) =>
        t.title.length > 20 ? t.title.slice(0, 18) + "…" : t.title,
      ),
      datasets: [
        {
          label: "Average score",
          data: sorted.map((t) => t.average_score),
          backgroundColor: sorted.map((t) =>
            t.type === "paper"
              ? "rgba(99,102,241,0.7)"
              : "rgba(16,185,129,0.7)",
          ),
          borderColor: sorted.map((t) =>
            t.type === "paper" ? "rgba(99,102,241,1)" : "rgba(16,185,129,1)",
          ),
          borderWidth: 2,
          borderRadius: 6,
          maxBarThickness: 45,
        },
      ],
    };
  }, [data]);

  // extra metadata for test chart legend
  const testChartMeta = useMemo(() => {
    if (!data?.test_averages) return [];
    return [...data.test_averages].sort(
      (a, b) => b.average_score - a.average_score,
    );
  }, [data]);

  // ── Top students ──
  const classOptions = useMemo(() => {
    if (!data?.top_students_by_class) return [];
    return Object.entries(data.top_students_by_class).map(([id, v]) => ({
      id,
      name: v.class_name,
    }));
  }, [data]);

  const topStudents = useMemo(() => {
    if (!data?.top_students_by_class) return [];
    if (selectedClassId === "all") {
      const merged = {};
      Object.values(data.top_students_by_class).forEach(({ students }) => {
        students.forEach((s) => {
          if (!merged[s.id] || s.avg_score > merged[s.id].avg_score)
            merged[s.id] = s;
        });
      });
      return Object.values(merged)
        .sort((a, b) => b.avg_score - a.avg_score)
        .slice(0, 10)
        .map((s, i) => ({ ...s, rank: i + 1 }));
    }
    return data.top_students_by_class[selectedClassId]?.students || [];
  }, [data, selectedClassId]);

  const topStudentsChartData = useMemo(() => {
    if (!topStudents.length) return null;
    return {
      labels: topStudents.map((s) => s.name),
      datasets: [
        {
          label: "Online average score",
          data: topStudents.map((s) => s.avg_score),
          backgroundColor: topStudents.map((_, i) =>
            i < 3
              ? [
                  "rgba(250,204,21,0.8)",
                  "rgba(148,163,184,0.8)",
                  "rgba(234,138,60,0.8)",
                ][i]
              : "rgba(59,130,246,0.6)",
          ),
          borderColor: topStudents.map((_, i) =>
            i < 3
              ? [
                  "rgba(250,204,21,1)",
                  "rgba(148,163,184,1)",
                  "rgba(234,138,60,1)",
                ][i]
              : "rgba(59,130,246,1)",
          ),
          borderWidth: 2,
          borderRadius: 6,
          maxBarThickness: 30,
        },
      ],
    };
  }, [topStudents]);

  // ── Loading ──
  if (loading && !data) {
    return (
      <>
        <Header />
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <div className="h-10 w-72 bg-gray-200 rounded-lg mx-auto animate-pulse mb-2" />
              <div className="h-5 w-56 bg-gray-100 rounded mx-auto animate-pulse" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SkeletonChart />
              <SkeletonChart />
            </div>
            <SkeletonChart />
          </div>
        </div>
      </>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <>
        <Header />
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <Card className="max-w-md border-0 shadow-xl">
            <CardContent className="pt-6 text-center">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-7 w-7 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Unable to load data
              </h3>
              <p className="text-sm text-gray-500">{error}</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // ── Main render ──
  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Title */}
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-white/60 bg-white/50 px-6 py-5 text-center shadow-sm backdrop-blur md:flex-row md:items-end md:justify-between md:text-left">
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-500 bg-clip-text text-transparent">
                Statistics Overview
              </h1>
              <p className="max-w-2xl text-gray-500">
                Track learning performance, test results, and class trends in
                one place.
              </p>
            </div>
          </div>

          {/* ── Charts row 1 ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* Class Averages */}
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden !p-0">
              <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2.5 rounded-xl">
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-gray-800">
                      Average Score by Class
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">
                      <span
                        className="inline-block w-3 h-3 rounded-sm mr-1"
                        style={{ backgroundColor: "rgba(99,102,241,0.7)" }}
                      />
                      Paper
                      <span
                        className="inline-block w-3 h-3 rounded-sm ml-3 mr-1"
                        style={{ backgroundColor: "rgba(16,185,129,0.7)" }}
                      />
                      Online
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {classChartData ? (
                  <div style={{ height: 300 }}>
                    <Bar 
                      data={classChartData} 
                      options={{
                        ...baseBarOptions,
                        plugins: {
                          ...baseBarOptions.plugins,
                          legend: { display: false },
                          tooltip: {
                            ...baseBarOptions.plugins.tooltip,
                            callbacks: {
                              title: (items) => items[0].label,
                              label: (item) => ` Average score: ${item.raw}`,
                              afterLabel: (item) => {
                                const type = classChartData.meta[item.dataIndex];
                                return type ? `Type: ${type}` : "";
                              },
                            },
                          },
                        },
                      }} 
                    />
                  </div>
                ) : (
                  <EmptyState
                    icon={GraduationCap}
                    text="No class data available yet"
                  />
                )}
              </CardContent>
            </Card>

            {/* Test Averages */}
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden !p-0">
              <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 p-2.5 rounded-xl">
                    <BookOpen className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-gray-800">
                      Average Score by Test
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">
                      <span
                        className="inline-block w-3 h-3 rounded-sm mr-1"
                        style={{ backgroundColor: "rgba(99,102,241,0.7)" }}
                      />
                      Paper
                      <span
                        className="inline-block w-3 h-3 rounded-sm ml-3 mr-1"
                        style={{ backgroundColor: "rgba(16,185,129,0.7)" }}
                      />
                      Online
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {testChartData ? (
                  <div style={{ height: 300 }}>
                    <Bar
                      data={testChartData}
                      options={{
                        ...baseBarOptions,
                        plugins: {
                          ...baseBarOptions.plugins,
                          legend: { display: false },
                          tooltip: {
                            ...baseBarOptions.plugins.tooltip,
                            callbacks: {
                              title: (items) => {
                                const idx = items[0]?.dataIndex;
                                const meta = testChartMeta[idx];
                                return meta
                                  ? `${meta.title} (${meta.type === "paper" ? "Paper" : "Online"})`
                                  : "";
                              },
                              label: (item) => ` Average score: ${item.raw}`,
                              afterLabel: (item) => {
                                const meta = testChartMeta[item.dataIndex];
                                return meta
                                  ? `Submissions: ${meta.submission_count}`
                                  : "";
                              },
                            },
                          },
                        },
                      }}
                    />
                  </div>
                ) : (
                  <EmptyState
                    icon={BookOpen}
                    text="No test data available yet"
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Top Students ── */}
          <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden mt-4 !p-0">
            <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-yellow-50">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 p-2.5 rounded-xl">
                    <Trophy className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-gray-800">
                      Top Students (Online Tests)
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Ranked by average online test score
                    </p>
                  </div>
                </div>
                {/* Class filter */}
                <div className="relative w-full sm:w-auto">
                  <select
                    id="class-filter"
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-9 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all cursor-pointer sm:w-auto"
                  >
                    <option value="all">All classes</option>
                    {classOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {topStudents.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-8 items-start">
                  {/* Chart */}
                  {topStudentsChartData && (
                    <div
                      style={{ height: Math.max(300, topStudents.length * 40) }}
                    >
                      <Bar
                        data={topStudentsChartData}
                        options={{
                          ...baseBarOptions,
                          indexAxis: "y",
                          plugins: {
                            ...baseBarOptions.plugins,
                            legend: { display: false },
                          },
                          scales: {
                            x: {
                              beginAtZero: true,
                              grid: { color: "rgba(0,0,0,0.04)" },
                              ticks: { font: { size: 12 } },
                            },
                            y: {
                              grid: { display: false },
                              ticks: { font: { size: 12 }, color: "#334155" },
                            },
                          },
                        }}
                      />
                    </div>
                  )}
                  {/* Leaderboard table */}
                  <div className="space-y-3">
                    {topStudents.map((s, i) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold text-white bg-gradient-to-br ${
                              i < 3
                                ? medalColors[i]
                                : "from-slate-400 to-slate-500"
                            }`}
                          >
                            {s.rank}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm group-hover:text-amber-700 transition-colors">
                              {s.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              {s.attempts_count} attempts
                            </p>
                          </div>
                        </div>
                        <span className="text-xl font-bold text-amber-600">
                          {s.avg_score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={Trophy}
                  text="No online test student data available yet"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="h-64 flex items-center justify-center text-gray-400">
      <div className="text-center">
        <Icon className="h-16 w-16 mx-auto mb-4 opacity-20" />
        <p className="text-sm">{text}</p>
      </div>
    </div>
  );
}
