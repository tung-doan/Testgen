"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LoadingScreen from "@/app/loading";
import { useClassroom } from "@/hooks/useClassroom";
import {
  BookOpen,
  Users,
  Calendar,
  GraduationCap,
  Award,
  TrendingUp,
  Mail,
  UserCircle,
} from "lucide-react";

export default function StudentClasses() {
  const router = useRouter();
  const { getClassroomStudentInfo } = useClassroom();

  const [studentInfo, setStudentInfo] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showClassmatesModal, setShowClassmatesModal] = useState(false);

  useEffect(() => {
    loadClassInfo();
  }, []);

  const loadClassInfo = async () => {
    try {
      setLoading(true);

      // Get student info from localStorage
      const studentData = JSON.parse(localStorage.getItem("student") || "{}");
      setStudentInfo(studentData);

      // ✅ Fetch real classroom data from API
      if (studentData.id) {
        const classroomData = await getClassroomStudentInfo(studentData.id);
        setClassInfo(classroomData);
      }
    } catch (error) {
      console.error("Error loading class info:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadgeClass = (score) => {
    if (!score) return "bg-gray-100 text-gray-800 border-gray-200";
    if (score >= 8) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 6.5) return "bg-blue-100 text-blue-800 border-blue-200";
    if (score >= 5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  if (loading) {
    return <LoadingScreen message="Loading class information..." />;
  }

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-8 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Page Header */}
          <Card className="border-0 shadow-xl overflow-hidden !p-0 mb-4">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white !p-0 !m-0">
              <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <BookOpen className="h-8 w-8" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl">My Classes</CardTitle>
                    <p className="text-purple-100 mt-1">
                      View your enrolled classes
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Student Info Card */}
          <Card className="border-0 shadow-xl !p-0 mb-4">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <GraduationCap className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Student Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="font-semibold text-gray-900">
                      {studentInfo?.name || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Award className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Student ID</p>
                    <p className="font-semibold text-gray-900">
                      {studentInfo?.student_id || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Class Information */}
          {!classInfo ? (
            <Card className="border-0 shadow-xl !p-0">
              <CardContent className="py-16 text-center">
                <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                  No Class Assigned
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  You are not currently enrolled in any class. Please contact
                  your teacher for enrollment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-xl overflow-hidden !p-0">
              <CardHeader className="border-b bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <BookOpen className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Current Class</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Your enrolled classroom
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Class Name */}
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6 rounded-lg mb-6">
                  <h2 className="text-3xl font-bold mb-2">{classInfo.name}</h2>
                  {classInfo.description && (
                    <p className="text-purple-100">{classInfo.description}</p>
                  )}
                </div>

                {/* Class Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Teacher Name */}
                  <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <GraduationCap className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-600">Teacher</span>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {classInfo.teacher?.name || "N/A"}
                    </p>
                  </div>

                  {/* Teacher Email */}
                  <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-indigo-100 p-2 rounded-lg">
                        <Mail className="h-5 w-5 text-indigo-600" />
                      </div>
                      <span className="text-sm text-gray-600">
                        Teacher Email
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm break-all">
                      {classInfo.teacher?.email || "N/A"}
                    </p>
                  </div>

                  {/* Total Students - Clickable */}
                  <button
                    onClick={() => setShowClassmatesModal(true)}
                    className="p-4 border rounded-lg hover:shadow-md hover:border-green-300 hover:bg-green-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-green-100 p-2 rounded-lg group-hover:bg-green-200 transition-colors">
                        <Users className="h-5 w-5 text-green-600" />
                      </div>
                      <span className="text-sm text-gray-600">
                        Total Students
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900 text-2xl">
                      {classInfo.total_students || 0}
                    </p>
                  </button>

                  {/* Enrollment Date */}
                  <div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-purple-100 p-2 rounded-lg">
                        <Calendar className="h-5 w-5 text-purple-600" />
                      </div>
                      <span className="text-sm text-gray-600">
                        Enrolled Since
                      </span>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {classInfo.enrollment_date
                        ? new Date(
                            classInfo.enrollment_date
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Stay Active!</p>
                      <p>
                        Complete your pending exams and check your history to
                        track your progress. Keep up the good work!
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ✅ Classmates Modal */}
      <Dialog open={showClassmatesModal} onOpenChange={setShowClassmatesModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl">
                  Classmates in {classInfo?.name}
                </DialogTitle>
                <DialogDescription className="text-gray-600 mt-1">
                  Total {classInfo?.total_students || 0} students in your class
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-6">
            {!classInfo?.classmates || classInfo.classmates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p>No classmates found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Student ID</TableHead>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold text-center">
                      Date of Birth
                    </TableHead>
                    <TableHead className="font-semibold text-center">
                      Avg Score
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classInfo.classmates.map((classmate) => (
                    <TableRow
                      key={classmate.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        classmate.id === studentInfo?.id
                          ? "bg-blue-50 border-l-4 border-blue-500"
                          : ""
                      }`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {classmate.id === studentInfo?.id && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                              You
                            </Badge>
                          )}
                          {classmate.student_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="bg-purple-100 rounded-full w-8 h-8 flex items-center justify-center">
                            <UserCircle className="h-5 w-5 text-purple-600" />
                          </div>
                          <span className="font-medium">{classmate.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-gray-600">
                        {classmate.date_of_birth
                          ? new Date(
                              classmate.date_of_birth
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        {classmate.average_score !== null &&
                        classmate.average_score !== undefined ? (
                          <Badge
                            className={`${getScoreBadgeClass(
                              classmate.average_score
                            )} font-semibold`}
                          >
                            {classmate.average_score}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">No data</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <Button
              variant="outline"
              onClick={() => setShowClassmatesModal(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
