"use client";
import React, { useState, useEffect } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { useClassroom } from "@/hooks/useClassroom";
import { useTest } from "@/hooks/useTest";
import {
  Loader2,
  UserPlus,
  Users,
  Award,
  Calendar,
  FileText,
  TrendingUp,
  AlertCircle,
  Bell,
  CheckCircle,
  XCircle,
  Mail,
  ChevronLeft,
  ChevronRight,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DeleteConfirmButton from "@/components/common/DeleteConfirmButton";
import { TableSkeleton } from "@/components/ui/skeletons";
import Notification from "@/components/common/Notification";

export default function ClassroomDetail({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const {
    getClassroomById,
    getStudents,
    inviteStudent,
    deleteStudent,
    getEnrollmentRequests,
    getEnrollmentRequestsCount,
    handleEnrollmentRequest,
  } = useClassroom();
  const { getAllTests } = useTest();

  // State management
  const [students, setStudents] = useState([]);
  const [tests, setTests] = useState([]);
  const [classroomName, setClassroomName] = useState("Class");
  const [classroomDescription, setClassroomDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Invite student dialog
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(null);

  // Enrollment request states
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [enrollmentRequests, setEnrollmentRequests] = useState([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success",
  });

  // Student detail modal state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => {
    fetchClassroomData();
    fetchPendingCount();
  }, [id]);

  const fetchClassroomData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [classroomData, studentsData, testsData] = await Promise.all([
        getClassroomById(id),
        getStudents(id),
        getAllTests(),
      ]);
      setClassroomName(classroomData.name || "Class");
      setClassroomDescription(classroomData.description || "");
      setStudents(studentsData);
      setTests(testsData);
      setCurrentPage(1);
    } catch (err) {
      setError("Failed to load classroom data. Please try again.");
      if (err.message === "UNAUTHORIZED") router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const count = await getEnrollmentRequestsCount(id);
      setPendingRequestsCount(count);
    } catch (err) {
      /* silently fail */
    }
  };

  const fetchEnrollmentRequests = async () => {
    try {
      setEnrollmentLoading(true);
      const data = await getEnrollmentRequests(id, "pending");
      setEnrollmentRequests(data);
    } catch (err) {
      console.error("Error fetching enrollment requests:", err);
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const openEnrollmentModal = () => {
    setIsEnrollmentModalOpen(true);
    fetchEnrollmentRequests();
  };

  const handleEnrollAction = async (requestId, action) => {
    try {
      setActionLoadingId(requestId);
      await handleEnrollmentRequest(requestId, action);
      setEnrollmentRequests((prev) => prev.filter((r) => r.id !== requestId));
      setPendingRequestsCount((prev) => Math.max(0, prev - 1));
      if (action === "approve") {
        const studentsData = await getStudents(id);
        setStudents(studentsData);
        showNotification("Student approved successfully!");
      } else {
        showNotification("Student request rejected.");
      }
    } catch (err) {
      const msg = err.response?.status === 404 ? "This request no longer exists." : err.message;
      showNotification(msg || "Failed to handle request", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInviteStudent = async () => {
    setInviteError(null);
    setInviteSuccess(null);
    if (!inviteEmail.trim()) {
      setInviteError("Please enter a student email");
      return;
    }
    try {
      setInviteLoading(true);
      const result = await inviteStudent(id, inviteEmail.trim());
      setInviteSuccess(result.message);
      showNotification("Invitation sent successfully!");
      setInviteEmail("");
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    try {
      await deleteStudent(studentId);
      setStudents(students.filter((student) => student.id !== studentId));
      showNotification("Student removed from class.");
    } catch (err) {
      showNotification(`Failed to delete student: ${err.message}`, "error");
      throw err;
    }
  };

  const handleRowClick = (student, event) => {
    if (event.target.closest("button") || event.target.closest("svg") || event.target.closest("[role='button']")) return;
    setSelectedStudent(student);
    setIsStudentModalOpen(true);
  };

  // Statistics
  const totalStudents = students.length;
  const studentsWithScores = students.filter(
    (s) => s.average_score !== null && s.average_score !== undefined,
  );
  const averageClassScore =
    studentsWithScores.length > 0
      ? (
          studentsWithScores.reduce(
            (sum, s) => sum + parseFloat(s.average_score || 0),
            0,
          ) / studentsWithScores.length
        ).toFixed(2)
      : "N/A";
  const topStudent = studentsWithScores.reduce(
    (max, s) =>
      parseFloat(s.average_score || 0) > parseFloat(max.average_score || 0)
        ? s
        : max,
    { average_score: null },
  );

  // Pagination logic
  const totalPages = Math.ceil(students.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentStudents = students.slice(startIndex, startIndex + rowsPerPage);

  // Auto-adjust pagination when items are deleted
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);
  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
  if (endPage - startPage + 1 < maxPagesToShow)
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  const pageNumbers = [];
  for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);

  return (
    <>
      <Header />
      <Navbar />
      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, show: false })}
      />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="md:col-span-4 border-0 shadow-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{classroomName}</h1>
                    {classroomDescription && (
                      <p className="text-emerald-100">{classroomDescription}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={openEnrollmentModal}
                      variant="outline"
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20 font-medium relative cursor-pointer"
                    >
                      <Bell className="h-5 w-5 mr-2" />
                      Pending Requests
                      {pendingRequestsCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold animate-pulse">
                          {pendingRequestsCount}
                        </span>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setInviteError(null);
                        setInviteSuccess(null);
                        setInviteEmail("");
                        setIsInviteModalOpen(true);
                      }}
                      className="bg-white text-emerald-700 hover:bg-emerald-50 font-medium shadow-lg cursor-pointer"
                    >
                      <Send className="h-5 w-5 mr-2" />
                      Invite Student
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            {[
              {
                label: "Total Students",
                value: totalStudents,
                icon: Users,
                color: "blue",
              },
              {
                label: "Class Average",
                value: averageClassScore,
                icon: TrendingUp,
                color: "emerald",
              },
              {
                label: "Top Score",
                value: topStudent.average_score ?? "N/A",
                icon: Award,
                color: "amber",
              },
              {
                label: "Active Tests",
                value: tests.length,
                icon: FileText,
                color: "purple",
              },
            ].map((stat) => (
              <Card
                key={stat.label}
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                      {loading ? (
                        <div className="h-9 w-16 bg-gray-100 animate-pulse rounded-md mt-1" />
                      ) : (
                        <p className="text-3xl font-bold text-gray-900">
                          {stat.value}
                        </p>
                      )}
                    </div>
                    <div className={`bg-${stat.color}-100 p-3 rounded-full`}>
                      <stat.icon className={`h-8 w-8 text-${stat.color}-600`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Students Table */}
          <Card className="border-0 shadow-xl !p-0 mt-4">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg">
                    {loading ? (
                      <div className="h-6 w-6 bg-gray-200 animate-pulse rounded" />
                    ) : (
                      <Users className="h-6 w-6 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    {loading ? (
                      <div className="space-y-2">
                        <div className="h-6 w-32 bg-gray-200 animate-pulse rounded" />
                        <div className="h-4 w-48 bg-gray-200 animate-pulse rounded" />
                      </div>
                    ) : (
                      <>
                        <CardTitle className="text-xl text-gray-800">
                          Student List
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          Click on a row to view student details
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <TableSkeleton rows={8} cols={5} />
              ) : error ? (
                <div className="text-center py-8 p-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 inline-block">
                    <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                    <p className="font-medium text-red-800 mb-4">{error}</p>
                    <Button
                      onClick={fetchClassroomData}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-16 p-6">
                  <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                    <Users className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                    No students yet
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Start building your class by inviting students via email.
                  </p>
                  <Button
                    onClick={() => {
                      setInviteError(null);
                      setInviteSuccess(null);
                      setInviteEmail("");
                      setIsInviteModalOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
                    size="lg"
                  >
                    <Send className="h-5 w-5 mr-2" />
                    Invite First Student
                  </Button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                          <TableHead className="font-semibold text-gray-700">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Student Name
                            </div>
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            <div className="flex items-center gap-2">
                              <Award className="h-4 w-4" />
                              Average Score
                            </div>
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Date of Birth
                            </div>
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentStudents.map((student, index) => {
                          const hasScore =
                            student.average_score !== null &&
                            student.average_score !== undefined;
                          const score = hasScore
                            ? parseFloat(student.average_score)
                            : null;
                          return (
                            <TableRow
                              key={student.student_id}
                              onClick={(e) => handleRowClick(student, e)}
                              className={`hover:bg-emerald-50/50 transition-all cursor-pointer group ${index === 0 && hasScore && score > 0 ? "bg-amber-50/30" : ""}`}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="bg-emerald-100 rounded-full w-8 h-8 flex items-center justify-center transition-colors group-hover:bg-emerald-200 overflow-hidden shadow-sm border border-emerald-200">
                                    {student.avatar ? (
                                      <img
                                        src={student.avatar}
                                        alt={student.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-emerald-700 font-semibold text-sm">
                                        {student.name.charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-medium text-gray-900">
                                    {student.name}
                                  </span>
                                  {index === 0 && hasScore && score > 0 && (
                                    <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                      <Award className="h-3 w-3 mr-1" />
                                      Top
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {hasScore ? (
                                  <Badge
                                    className={`${score >= 8 ? "bg-emerald-100 text-emerald-800 border-emerald-200" : score >= 6.5 ? "bg-blue-100 text-blue-800 border-blue-200" : score >= 5 ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-red-100 text-red-800 border-red-200"} font-semibold`}
                                  >
                                    {student.average_score}
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400 text-sm">
                                    No data
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-gray-600">
                                {student.date_of_birth || (
                                  <span className="text-gray-400">
                                    Not provided
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-2">
                                  <DeleteConfirmButton
                                    onConfirm={() =>
                                      handleDeleteStudent(student.id)
                                    }
                                    buttonText=""
                                    title="Delete Student"
                                    description="Are you sure you want to delete this student?"
                                    className="shadow-sm hover:shadow-md transition-all hover:scale-105"
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                      <Button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        variant="outline"
                        className="gap-1 text-sm"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="flex items-center space-x-1">
                        {pageNumbers.map((page) => (
                          <Button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            variant={currentPage === page ? "default" : "ghost"}
                            size="sm"
                            className={
                              currentPage === page
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "text-gray-600 hover:text-gray-900"
                            }
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      <Button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages),
                          )
                        }
                        disabled={currentPage >= totalPages}
                        variant="outline"
                        className="gap-1 text-sm"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <div className="px-6 py-3 border-t border-gray-100 bg-white">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        Showing{" "}
                        <span className="font-semibold">
                          {Math.min(startIndex + 1, students.length)}
                        </span>
                        –
                        <span className="font-semibold">
                          {Math.min(startIndex + rowsPerPage, students.length)}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold">{students.length}</span>{" "}
                        student{students.length !== 1 && "s"}
                      </p>
                      <div className="flex items-center gap-2">
                        {studentsWithScores.length > 0 && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {studentsWithScores.length} with scores
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invite Student Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-emerald-100 p-3 rounded-full">
                <Send className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-semibold">
                  Invite Student
                </DialogTitle>
                <DialogDescription className="text-gray-600 mt-1">
                  Send an invitation to a student by email
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {inviteError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{inviteError}</p>
              </div>
            )}
            {inviteSuccess && (
              <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-emerald-800">{inviteSuccess}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label
                htmlFor="inviteEmail"
                className="text-sm font-semibold flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Student Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="student@example.com"
                className="w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleInviteStudent();
                  }
                }}
              />
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 mt-2 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800">
                The student must have a registered account. They will receive an
                invitation that they can accept or decline.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              onClick={() => setIsInviteModalOpen(false)}
              variant="outline"
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleInviteStudent}
              disabled={inviteLoading}
              className="bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
            >
              <Send className="h-4 w-4 mr-2" />
              {inviteLoading ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enrollment Requests Modal */}
      <Dialog
        open={isEnrollmentModalOpen}
        onOpenChange={setIsEnrollmentModalOpen}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Bell className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-semibold">
                  Pending Requests
                </DialogTitle>
                <DialogDescription className="text-gray-600 mt-1">
                  Students requesting to join {classroomName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="mt-4">
            {enrollmentLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : enrollmentRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Bell className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">No pending requests</p>
                <p className="text-sm mt-1">
                  All enrollment requests have been processed.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {enrollmentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 font-bold text-sm">
                          {req.student_name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {req.student_name}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          {req.student_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {req.student_email}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Requested{" "}
                          {new Date(req.created_at).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <Button
                        size="sm"
                        onClick={() => handleEnrollAction(req.id, "approve")}
                        disabled={actionLoadingId === req.id}
                        className="bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md transition-all"
                      >
                        {actionLoadingId === req.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Accept
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEnrollAction(req.id, "reject")}
                        disabled={actionLoadingId === req.id}
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 shadow-sm"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setIsEnrollmentModalOpen(false)}
              className="cursor-pointer"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Detail Modal */}
      <Dialog open={isStudentModalOpen} onOpenChange={setIsStudentModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl overflow-hidden p-0 border border-emerald-100 shadow-2xl bg-white">
          <DialogHeader className="sr-only">
            <DialogTitle>Student Profile Details</DialogTitle>
            <DialogDescription>Detailed view of student's personal information</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="relative">
              {/* Header profile background banner */}
              <div className="h-28 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
              
              {/* Profile Avatar Overlay */}
              <div className="absolute top-14 left-1/2 transform -translate-x-1/2">
                <div className="w-24 h-24 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden flex items-center justify-center">
                  {selectedStudent.avatar ? (
                    <img
                      src={selectedStudent.avatar}
                      alt={selectedStudent.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-3xl">
                      {selectedStudent.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Content */}
              <div className="pt-16 pb-8 px-6 text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  {selectedStudent.name}
                </h3>
                <p className="text-sm font-semibold text-emerald-600 bg-emerald-50 inline-block px-3 py-1 rounded-full mb-6">
                  {selectedStudent.student_id}
                </p>
                
                <div className="space-y-4 text-left border-t border-gray-100 pt-6">
                  {/* Date of birth */}
                  <div className="flex items-center gap-3 bg-gray-50/50 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Date of Birth</p>
                      <p className="text-sm text-gray-700 font-semibold">
                        {selectedStudent.date_of_birth || "Not provided"}
                      </p>
                    </div>
                  </div>
                  
                  {/* Email */}
                  <div className="flex items-center gap-3 bg-gray-50/50 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Email Address</p>
                      <p className="text-sm text-gray-700 font-semibold truncate max-w-[280px]">
                        {selectedStudent.email || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
                <Button
                  onClick={() => setIsStudentModalOpen(false)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md px-6 hover:cursor-pointer"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
