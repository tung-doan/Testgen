"use client";
import React, { useState, useEffect } from "react";
import { use } from "react";
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
import axios from "axios";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/app/loading";

export default function Students({ params }) {
  const { id } = use(params); // Unwrap params with React.use()
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [tests, setTests] = useState([]);
  const [classroomName, setClassroomName] = useState("Class");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isAddSubmissionModalOpen, setIsAddSubmissionModalOpen] = useState(false);
  const [currentStudentId, setCurrentStudentId] = useState(null);
  const [currentStudentInfo, setCurrentStudentInfo] = useState({
    name: "",
    date_of_birth: "",
  });
  const [newStudentData, setNewStudentData] = useState({
    name: "",
    date_of_birth: "",
    student_id: "",
  });
  const [submissionData, setSubmissionData] = useState({
    testId: "",
    submissionImage: null,
  });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    const fetchStudentsAndTests = async () => {
      try {
        setLoading(true);
        // Fetch classroom details
        const classroomResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}classroom/${id}/`,
          { withCredentials: true }
        );
        setClassroomName(classroomResponse.data.name || "Class");

        // Fetch students
        const studentsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}classroom/${id}/students/`,
          { withCredentials: true }
        );
        console.log("Students:", studentsResponse.data);
        setStudents(studentsResponse.data);

        // Fetch available tests
        const testsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}api/tests/`,
          { withCredentials: true }
        );
        setTests(testsResponse.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again.");
        if (err.response?.status === 401) {
          router.push("/login");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStudentsAndTests();
  }, [id, router]);

  const handleDeleteStudent = async (studentId, event) => {
    event.stopPropagation(); // Ngăn sự kiện click của TableRow
    if (window.confirm("Are you sure you want to delete this student?")) {
      try {
        await axios.delete(
          `${process.env.NEXT_PUBLIC_API_URL}classroom/students/${studentId}/`,
          { withCredentials: true }
        );
        setStudents(students.filter((student) => student.id !== studentId));
        alert("Student deleted successfully!");
      } catch (err) {
        console.error("Error deleting student:", err);
        alert("Failed to delete student: " + (err.response?.data?.detail || err.message));
      }
    }
  };

  const handleAddSubmission = (studentId, event) => {
    event.stopPropagation(); // Ngăn sự kiện click của TableRow
    const student = students.find((s) => s.id === studentId);
    if (student) {
      setCurrentStudentId(studentId);
      setCurrentStudentInfo({
        name: student.name || "N/A",
        date_of_birth: student.date_of_birth || "N/A",
      });
      setIsAddSubmissionModalOpen(true);
    }
  };

  const handleSubmitSubmission = async () => {
    try {
      setUploadLoading(true);
      setUploadError(null);
      const formData = new FormData();
      formData.append("test_id", submissionData.testId);
      formData.append("student_id", currentStudentId);
      formData.append("submission_image", submissionData.submissionImage);

      const response = await axios.post(
        `api/submissions/upload_submission/`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        }
      );
      alert("Submission added successfully!");
      setIsAddSubmissionModalOpen(false);
      setSubmissionData({ testId: "", submissionImage: null });
      setCurrentStudentInfo({ name: "", date_of_birth: "" });
      const studentsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}classroom/${id}/students/`,
        { withCredentials: true }
      );
      setStudents(studentsResponse.data);
    } catch (err) {
      console.error("Error adding submission:", err);
      setUploadError(err.response?.data?.error || "Failed to upload submission.");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleAddStudent = () => {
    setIsAddStudentModalOpen(true);
  };

  const handleSubmitNewStudent = async () => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}classroom/students/`,
        {
          classroom: id,
          name: newStudentData.name,
          student_id: newStudentData.student_id,
          date_of_birth: newStudentData.date_of_birth || null,
        },
        { withCredentials: true }
      );
      alert("Student added successfully!");
      setIsAddStudentModalOpen(false);
      setNewStudentData({ name: "", date_of_birth: "", student_id: "" });
      const studentsResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}classroom/${id}/students/`,
        { withCredentials: true }
      );
      setStudents(studentsResponse.data);
    } catch (err) {
      console.error("Error adding student:", err);
      const errorMessage = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      alert("Failed to add student: " + errorMessage);
    }
  };

  // Hàm xử lý chuyển hướng khi nhấp vào hàng
  const handleRowClick = (studentName) => {
    const params = new URLSearchParams();
    params.append("name", studentName);
    params.append("class", classroomName);
    router.push(`/student?${params.toString()}`);
  };

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200 p-4">
        <Card className="w-full max-w-4xl shadow-xl border-0 transition-transform hover:scale-[1.02]">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg flex justify-between items-center">
            <CardTitle className="text-2xl font-semibold">
              Students in {classroomName}
            </CardTitle>
            <Button
              onClick={handleAddStudent}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition-colors duration-200"
            >
              Add New Student
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <LoadingScreen />
            ) : error ? (
              <p className="text-center text-red-600">{error}</p>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4">
                <h1 className="text-3xl text-gray-700 text-center font-normal">
                  No students in this class yet.
                </h1>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-700 font-semibold">
                      Student ID
                    </TableHead>
                    <TableHead className="text-gray-700 font-semibold">
                      Student Name
                    </TableHead>
                    <TableHead className="text-gray-700 font-semibold">
                      Average Score
                    </TableHead>
                    <TableHead className="text-gray-700 font-semibold">
                      Date of Birth
                    </TableHead>
                    <TableHead className="text-gray-700 font-semibold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow
                      key={student.student_id}
                      onClick={() => handleRowClick(student.name)} // Thêm sự kiện onClick
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <TableCell>{student.student_id}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.average_score ? student.average_score : "N/A"}</TableCell>
                      <TableCell>{student.date_of_birth || "N/A"}</TableCell>
                      <TableCell>
                        <Button
                          onClick={(e) => handleAddSubmission(student.id, e)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded-lg transition-colors duration-200 mr-2"
                        >
                          Add Submission
                        </Button>
                        <Button
                          onClick={(e) => handleDeleteStudent(student.id, e)}
                          className="bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-3 rounded-lg transition-colors duration-200"
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal for adding new student */}
      <Dialog
        open={isAddStudentModalOpen}
        onOpenChange={setIsAddStudentModalOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Full Name
              </Label>
              <Input
                id="name"
                value={newStudentData.name}
                onChange={(e) => setNewStudentData({ ...newStudentData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date_of_birth" className="text-right">
                Date of Birth
              </Label>
              <Input
                id="date_of_birth"
                type="date"
                value={newStudentData.date_of_birth}
                onChange={(e) => setNewStudentData({ ...newStudentData, date_of_birth: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="student_id" className="text-right">
                Student ID
              </Label>
              <Input
                id="student_id"
                value={newStudentData.student_id}
                onChange={(e) => setNewStudentData({ ...newStudentData, student_id: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setIsAddStudentModalOpen(false);
                setNewStudentData({ name: "", date_of_birth: "", student_id: "" });
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitNewStudent}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal for adding submission */}
      <Dialog
        open={isAddSubmissionModalOpen}
        onOpenChange={setIsAddSubmissionModalOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {uploadError && <p className="text-red-600">{uploadError}</p>}
            <div>
              <Label
                htmlFor="participantName"
                className="block text-sm font-medium text-gray-700"
              >
                Participant Name
              </Label>
              <Input
                id="participantName"
                value={currentStudentInfo.name}
                readOnly
                className="mt-1 w-full rounded-lg border-gray-300 bg-gray-100"
              />
            </div>
            <div>
              <Label
                htmlFor="testSelect"
                className="block text-sm font-medium text-gray-700"
              >
                Test
              </Label>
              <Select
                onValueChange={(value) => setSubmissionData({ ...submissionData, testId: value })}
                value={submissionData.testId}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Select a test" />
                </SelectTrigger>
                <SelectContent>
                  {tests.map((test) => (
                    <SelectItem key={test.id} value={test.id} className="hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200">
                      {test.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label
                htmlFor="submissionImage"
                className="block text-sm font-medium text-gray-700"
              >
                Submission Image
              </Label>
              <Input
                id="submissionImage"
                type="file"
                accept="image/*"
                onChange={(e) => setSubmissionData({ ...submissionData, submissionImage: e.target.files[0] })}
                className="mt-1 w-full"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              onClick={() => {
                setIsAddSubmissionModalOpen(false);
                setSubmissionData({ testId: "", submissionImage: null });
                setUploadError(null);
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-1 px-3 rounded-lg transition-colors duration-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitSubmission}
              disabled={uploadLoading}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-3 rounded-lg transition-colors duration-200 disabled:bg-gray-400"
            >
              {uploadLoading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}