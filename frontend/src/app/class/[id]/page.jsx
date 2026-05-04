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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import LoadingScreen from "@/app/loading";
import { useClassroom } from "@/hooks/useClassroom";
import { useTest } from "@/hooks/useTest";
import { useSubmission } from "@/hooks/useSubmission";
import {
  Loader2,
  UserPlus,
  Users,
  Trash2,
  Upload,
  Award,
  Calendar,
  IdCard,
  FileText,
  Image as ImageIcon,
  TrendingUp,
  AlertCircle,
  Bell,
  CheckCircle,
  XCircle,
  Mail,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DeleteConfirmButton from "@/components/common/DeleteConfirmButton";

export default function ClassroomDetail({ params }) {
  const { id } = use(params);
  const router = useRouter();

  // Custom hooks
  const { getClassroomById, getStudents, addStudent, deleteStudent, getEnrollmentRequests, getEnrollmentRequestsCount, handleEnrollmentRequest } =
    useClassroom();
  const { getAllTests } = useTest();
  const { uploadSubmission, uploadProgress } = useSubmission();

  // State management
  const [students, setStudents] = useState([]);
  const [tests, setTests] = useState([]);
  const [classroomName, setClassroomName] = useState("Class");
  const [classroomDescription, setClassroomDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isAddSubmissionModalOpen, setIsAddSubmissionModalOpen] =
    useState(false);
  const [currentStudentId, setCurrentStudentId] = useState(null);

  // FIX: Khởi tạo với giá trị string rõ ràng
  const [currentStudentInfo, setCurrentStudentInfo] = useState({
    name: "",
    date_of_birth: "",
    student_id: "",
  });

  // FIX: Đảm bảo tất cả fields là string, không phải undefined
  const [newStudentData, setNewStudentData] = useState({
    name: "",
    date_of_birth: "",
    student_id: "",
    password: "",
  });

  const [submissionData, setSubmissionData] = useState({
    testId: "",
    submissionImage: null,
  });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Enrollment request states
  const [isEnrollmentModalOpen, setIsEnrollmentModalOpen] = useState(false);
  const [enrollmentRequests, setEnrollmentRequests] = useState([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

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
    } catch (err) {
      console.error("Error fetching classroom data:", err);
      setError("Failed to load classroom data. Please try again.");

      if (err.message === "UNAUTHORIZED") {
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const count = await getEnrollmentRequestsCount(id);
      setPendingRequestsCount(count);
    } catch (err) {
      // silently fail
    }
  };

  const fetchEnrollmentRequests = async () => {
    try {
      setEnrollmentLoading(true);
      const data = await getEnrollmentRequests(id, 'pending');
      setEnrollmentRequests(data);
    } catch (err) {
      console.error('Error fetching enrollment requests:', err);
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
      // Remove from list
      setEnrollmentRequests(prev => prev.filter(r => r.id !== requestId));
      setPendingRequestsCount(prev => Math.max(0, prev - 1));
      // Refresh students if approved
      if (action === 'approve') {
        const studentsData = await getStudents(id);
        setStudents(studentsData);
      }
    } catch (err) {
      alert(err.message || 'Failed to handle request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAddStudent = () => {
    setIsAddStudentModalOpen(true);
  };

  const handleSubmitNewStudent = async () => {
    try {
      if (!newStudentData.name || !newStudentData.student_id) {
        alert("Please fill in all required fields (Name and Student ID)");
        return;
      }

      // Tạo payload chỉ với các giá trị có nội dung
      const payload = {
        name: newStudentData.name,
        student_id: newStudentData.student_id,
        password: newStudentData.password,
      };

      // Chỉ thêm date_of_birth nếu có giá trị
      if (
        newStudentData.date_of_birth &&
        newStudentData.date_of_birth.trim() !== ""
      ) {
        payload.date_of_birth = newStudentData.date_of_birth;
      }

      // password
      if (newStudentData.password && newStudentData.password.trim() !== "") {
        payload.password = newStudentData.password;
      }

      await addStudent(id, payload);

      alert("Student added successfully!");
      setIsAddStudentModalOpen(false);

      // FIX: Reset về giá trị string rõ ràng
      setNewStudentData({
        name: "",
        date_of_birth: "",
        student_id: "",
        password: "",
      });

      const studentsData = await getStudents(id);
      setStudents(studentsData);
    } catch (err) {
      console.error("Error adding student:", err);
      alert(`Failed to add student: ${err.message}`);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    try {
      await deleteStudent(studentId);
      setStudents(students.filter((student) => student.id !== studentId));
      // alert("Student deleted successfully!");
    } catch (err) {
      console.error("Error deleting student:", err);
      alert(`Failed to delete student: ${err.message}`);
      throw err;
    }
  };

  const handleRowClick = (studentName, event) => {
    if (event.target.closest("button")) {
      return;
    }

    const params = new URLSearchParams();
    params.append("name", studentName);
    params.append("class", classroomName);
    router.push(`/student?${params.toString()}`);
  };

  // Calculate statistics
  const totalStudents = students.length;
  const studentsWithScores = students.filter(
    (s) => s.average_score !== null && s.average_score !== undefined
  );
  const averageClassScore =
    studentsWithScores.length > 0
      ? (
          studentsWithScores.reduce(
            (sum, s) => sum + parseFloat(s.average_score || 0),
            0
          ) / studentsWithScores.length
        ).toFixed(2)
      : "N/A";
  const topStudent = studentsWithScores.reduce(
    (max, s) =>
      parseFloat(s.average_score || 0) > parseFloat(max.average_score || 0)
        ? s
        : max,
    { average_score: null }
  );

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Header with Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Class Info Card */}
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
                      className="bg-white/10 border-white/30 text-white hover:bg-white/20 font-medium relative"
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
                      onClick={handleAddStudent}
                      className="bg-white text-emerald-700 hover:bg-emerald-50 font-medium shadow-lg"
                    >
                      <UserPlus className="h-5 w-5 mr-2" />
                      Add Student
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Students</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {totalStudents}
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Class Average</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {averageClassScore}
                    </p>
                  </div>
                  <div className="bg-emerald-100 p-3 rounded-full">
                    <TrendingUp className="h-8 w-8 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Top Score</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {topStudent.average_score !== null &&
                      topStudent.average_score !== undefined
                        ? topStudent.average_score
                        : "N/A"}
                    </p>
                  </div>
                  <div className="bg-amber-100 p-3 rounded-full">
                    <Award className="h-8 w-8 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Active Tests</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {tests.length}
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-full">
                    <FileText className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Students Table */}
          <Card className="border-0 shadow-xl !p-0 mt-4">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg">
                    <Users className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-gray-800">
                      Student List
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Click on a row to view student details • Manage actions on
                      the right
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {loading ? (
                <LoadingScreen message="Loading classroom data..." />
              ) : error ? (
                <div className="text-center py-8">
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
                <div className="text-center py-16">
                  <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                    <Users className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                    No students yet
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Start building your class by adding students. You can track
                    their performance and manage submissions.
                  </p>
                  <Button
                    onClick={handleAddStudent}
                    className="bg-emerald-600 hover:bg-emerald-700 shadow-lg"
                    size="lg"
                  >
                    <UserPlus className="h-5 w-5 mr-2" />
                    Add First Student
                  </Button>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                          <TableHead className="font-semibold text-gray-700">
                            <div className="flex items-center gap-2">
                              <IdCard className="h-4 w-4" />
                              Student ID
                            </div>
                          </TableHead>
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
                        {students.map((student, index) => {
                          const hasScore =
                            student.average_score !== null &&
                            student.average_score !== undefined;
                          const score = hasScore
                            ? parseFloat(student.average_score)
                            : null;

                          return (
                            <TableRow
                              key={student.student_id}
                              onClick={(e) => handleRowClick(student.name, e)}
                              className={`hover:bg-emerald-50/50 transition-all cursor-pointer group ${
                                index === 0 && hasScore && score > 0
                                  ? "bg-amber-50/30"
                                  : ""
                              }`}
                            >
                              <TableCell className="font-medium text-gray-900">
                                {student.student_id}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="bg-emerald-100 rounded-full w-8 h-8 flex items-center justify-center transition-colors group-hover:bg-emerald-200">
                                    <span className="text-emerald-700 font-semibold text-sm">
                                      {student.name.charAt(0).toUpperCase()}
                                    </span>
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
                                    className={`${
                                      score >= 8
                                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                        : score >= 6.5
                                        ? "bg-blue-100 text-blue-800 border-blue-200"
                                        : score >= 5
                                        ? "bg-amber-100 text-amber-800 border-amber-200"
                                        : "bg-red-100 text-red-800 border-red-200"
                                    } font-semibold`}
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
                                    onConfirm={() => handleDeleteStudent(student.id)}
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

                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Showing{" "}
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
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Student Modal */}
      <Dialog open={isAddStudentModalOpen} onOpenChange={setIsAddStudentModalOpen}>
      <DialogContent className="sm:max-w-[500px] flex flex-col gap-4">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-100 p-3 rounded-full">
              <UserPlus className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-semibold">
                Add New Student
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-1">
                Fill in all required fields below
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-4 flex flex-col gap-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-sm font-semibold flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={newStudentData.name}
              onChange={(e) =>
                setNewStudentData({ ...newStudentData, name: e.target.value })
              }
              placeholder="Enter student's full name"
              className="w-full"
              required
            />
          </div>

          {/* Student ID */}
          <div className="space-y-2">
            <Label
              htmlFor="student_id"
              className="text-sm font-semibold flex items-center gap-2"
            >
              <IdCard className="h-4 w-4" />
              Student ID <span className="text-red-500">*</span>
            </Label>
            <Input
              id="student_id"
              value={newStudentData.student_id}
              onChange={(e) =>
                setNewStudentData({
                  ...newStudentData,
                  student_id: e.target.value,
                })
              }
              placeholder="Enter student ID (e.g., ST001)"
              className="w-full"
              required
            />
          </div>

          {/* Password - REQUIRED */}
          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-sm font-semibold flex items-center gap-2"
            >
              <span className="h-4 w-4 inline-block">🔒</span>
              Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={newStudentData.password || ""}
              onChange={(e) =>
                setNewStudentData({
                  ...newStudentData,
                  password: e.target.value || "",
                })
              }
              placeholder="Enter password (min 6 characters)"
              className="w-full"
              minLength={6}
              required
            />
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mt-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                <strong>Important:</strong> This password will be used by the student to login. Make sure it's at least 6 characters long.
              </p>
            </div>
          </div>

          {/* Date of Birth - Optional */}
          <div className="space-y-2">
            <Label
              htmlFor="date_of_birth"
              className="text-sm font-semibold flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Date of Birth{" "}
              <span className="text-gray-500 text-xs">(Optional)</span>
            </Label>
            <Input
              id="date_of_birth"
              type="date"
              value={newStudentData.date_of_birth || ""}
              onChange={(e) =>
                setNewStudentData({
                  ...newStudentData,
                  date_of_birth: e.target.value || "",
                })
              }
              className="w-full"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            onClick={() => {
              setIsAddStudentModalOpen(false);
              setNewStudentData({
                name: "",
                date_of_birth: "",
                student_id: "",
                password: "",
              });
            }}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmitNewStudent}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      {/* Enrollment Requests Modal */}
      <Dialog open={isEnrollmentModalOpen} onOpenChange={setIsEnrollmentModalOpen}>
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
                <p className="text-sm mt-1">All enrollment requests have been processed.</p>
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
                          <span className="flex items-center gap-1">
                            <IdCard className="h-3 w-3" />
                            {req.student_id_code}
                          </span>
                          {req.student_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {req.student_email}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Requested {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <Button
                        size="sm"
                        onClick={() => handleEnrollAction(req.id, 'approve')}
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
                        onClick={() => handleEnrollAction(req.id, 'reject')}
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
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
