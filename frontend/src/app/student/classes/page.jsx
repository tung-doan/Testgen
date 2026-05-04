"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/skeletons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ClassesLoading from "./loading";
import { useClassroom } from "@/hooks/useClassroom";
import {
  BookOpen,
  Users,
  GraduationCap,
  Mail,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  LogIn,
  ArrowRight,
  X,
  LogOut,
} from "lucide-react";

export default function StudentClasses() {
  const router = useRouter();
  const {
    getMyEnrolledClassrooms,
    getAllAvailableClassrooms,
    requestEnrollment,
    unenrollFromClassroom,
  } = useClassroom();

  const [activeTab, setActiveTab] = useState("enrolled"); // "enrolled" | "browse"
  const [enrolledData, setEnrolledData] = useState(null);
  const [allClassrooms, setAllClassrooms] = useState([]);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [selectedClassroomForLeave, setSelectedClassroomForLeave] =
    useState(null);
  const [filteredClassrooms, setFilteredClassrooms] = useState([]);
  const [loadingEnrolled, setLoadingEnrolled] = useState(true);
  const [loadingBrowse, setLoadingBrowse] = useState(false);
  const [requestingId, setRequestingId] = useState(null);
  const [leavingId, setLeavingId] = useState(null);
  const [hasFetchedBrowse, setHasFetchedBrowse] = useState(false);
  const [filterClassName, setFilterClassName] = useState("");
  const [filterTeacherName, setFilterTeacherName] = useState("");
  const [filterTeacherEmail, setFilterTeacherEmail] = useState("");
  const [currentPageEnrolled, setCurrentPageEnrolled] = useState(1);
  const [currentPageBrowse, setCurrentPageBrowse] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadEnrolledClasses();
  }, []);

  useEffect(() => {
    if (activeTab === "browse" && !hasFetchedBrowse) {
      loadAllClassrooms();
    }
  }, [activeTab]);

  // Filter classrooms based on search criteria
  useEffect(() => {
    const filtered = allClassrooms.filter((classroom) => {
      const matchesClassName = classroom.name
        .toLowerCase()
        .includes(filterClassName.toLowerCase());
      const matchesTeacherName = (classroom.teacher_name || "")
        .toLowerCase()
        .includes(filterTeacherName.toLowerCase());
      const matchesTeacherEmail = (classroom.teacher_email || "")
        .toLowerCase()
        .includes(filterTeacherEmail.toLowerCase());

      return matchesClassName && matchesTeacherName && matchesTeacherEmail;
    });
    setFilteredClassrooms(filtered);
    setCurrentPageBrowse(1); // Reset to first page when filter changes
  }, [filterClassName, filterTeacherName, filterTeacherEmail, allClassrooms]);

  const loadEnrolledClasses = async () => {
    try {
      setLoadingEnrolled(true);
      const data = await getMyEnrolledClassrooms();
      setEnrolledData(data);
    } catch (error) {
      console.error("Error loading enrolled classes:", error);
    } finally {
      setLoadingEnrolled(false);
    }
  };

  const loadAllClassrooms = async () => {
    try {
      setLoadingBrowse(true);
      const data = await getAllAvailableClassrooms();
      setAllClassrooms(data);
      setHasFetchedBrowse(true);
    } catch (error) {
      console.error("Error loading all classrooms:", error);
    } finally {
      setLoadingBrowse(false);
    }
  };

  const handleRequestJoin = async (classroomId) => {
    try {
      setRequestingId(classroomId);
      await requestEnrollment(classroomId);
      // Update local state to reflect pending status
      setAllClassrooms((prev) =>
        prev.map((c) =>
          c.id === classroomId ? { ...c, enrollment_status: "pending" } : c,
        ),
      );
    } catch (error) {
      alert(error.message || "Failed to send request");
    } finally {
      setRequestingId(null);
    }
  };

  const openLeaveDialog = (classroom) => {
    setSelectedClassroomForLeave(classroom);
    setShowLeaveDialog(true);
  };

  const confirmLeaveClassroom = async () => {
    if (!selectedClassroomForLeave) return;

    try {
      setLeavingId(selectedClassroomForLeave.id);
      await unenrollFromClassroom(selectedClassroomForLeave.id);
      const updatedData = await getMyEnrolledClassrooms();
      setEnrolledData(updatedData);
      setShowLeaveDialog(false);
      setSelectedClassroomForLeave(null);
    } catch (error) {
      alert(error.message || "Failed to leave classroom");
    } finally {
      setLeavingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "joined":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
            <CheckCircle className="h-3 w-3" /> Joined
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200 gap-1">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const getRequestButton = (classroom) => {
    if (classroom.enrollment_status === "joined") {
      return (
        <Button
          disabled
          size="sm"
          className="bg-green-100 text-green-800 border border-green-200 hover:bg-green-100 cursor-not-allowed"
        >
          <CheckCircle className="h-4 w-4 mr-1.5" />
          Joined
        </Button>
      );
    }
    if (classroom.enrollment_status === "pending") {
      return (
        <Button
          disabled
          size="sm"
          className="bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-100 cursor-not-allowed"
        >
          <Clock className="h-4 w-4 mr-1.5" />
          Pending
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        onClick={() => handleRequestJoin(classroom.id)}
        disabled={requestingId === classroom.id}
        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all hover:cursor-pointer"
      >
        {requestingId === classroom.id ? (
          <span className="flex items-center gap-1.5">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Sending...
          </span>
        ) : (
          <>
            <LogIn className="h-4 w-4 mr-1.5" />
            Request to Join
          </>
        )}
      </Button>
    );
  };

  if (loadingEnrolled) {
    return <ClassesLoading />;
  }

  const enrolledClassrooms = enrolledData?.classrooms || [];
  const hasEnrolled = enrolledClassrooms.length > 0;

  const clearFilters = () => {
    setFilterClassName("");
    setFilterTeacherName("");
    setFilterTeacherEmail("");
  };

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Tab Switcher */}
          <div className="flex gap-2 bg-white rounded-xl shadow-md p-1.5 mb-4">
            <button
              onClick={() => setActiveTab("enrolled")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === "enrolled"
                  ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <BookOpen className="h-4 w-4 " />
              My Enrolled Classes
              {enrolledClassrooms.length > 0 && (
                <Badge
                  className={`ml-1 ${
                    activeTab === "enrolled"
                      ? "bg-white/20 text-white border-white/30"
                      : "bg-purple-100 text-purple-800 border-purple-200"
                  }`}
                >
                  {enrolledClassrooms.length}
                </Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab("browse")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === "browse"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Search className="h-4 w-4" />
              Browse All Classes
            </button>
          </div>

          {/* ============================================ */}
          {/* ENROLLED TAB */}
          {/* ============================================ */}
          {activeTab === "enrolled" && (
            <>
              {!hasEnrolled ? (
                <Card className="border-0 shadow-xl !p-0">
                  <CardContent className="py-16 text-center">
                    <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                      <BookOpen className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                      No Classes Yet
                    </h3>
                    <p className="text-gray-500 max-w-md mx-auto mb-6">
                      You haven't joined any classes yet. Browse available
                      classes and request to join!
                    </p>
                    <Button
                      onClick={() => setActiveTab("browse")}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
                    >
                      <Search className="h-5 w-5 mr-2" />
                      Browse Classes
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-xl overflow-hidden !p-0">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">
                    <div className="flex items-center justify-between p-2">
                      <div>
                        <CardTitle className="text-xl">
                          My Enrolled Classes
                        </CardTitle>
                        <p className="text-purple-100 text-sm mt-1">
                          {enrolledClassrooms.length} class
                          {enrolledClassrooms.length !== 1 ? "es" : ""}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loadingEnrolled ? (
                      <div className="p-6">
                        <TableSkeleton rows={6} cols={5} />
                      </div>
                    ) : (
                      <div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-gray-50 border-b-2 border-gray-200">
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-32">
                                  Class Name
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-40">
                                  Teacher
                                </th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-48">
                                  Email
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 w-24">
                                  Students
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 w-32">
                                  Status
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 w-32">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {enrolledClassrooms
                                .slice(
                                  (currentPageEnrolled - 1) * itemsPerPage,
                                  currentPageEnrolled * itemsPerPage,
                                )
                                .map((classroom) => (
                                  <tr
                                    key={classroom.id}
                                    className="hover:bg-purple-50/50 transition-colors"
                                  >
                                    <td className="px-6 py-4">
                                      <p className="font-semibold text-gray-900 truncate">
                                        {classroom.name}
                                      </p>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <GraduationCap className="h-4 w-4 text-purple-600 flex-shrink-0" />
                                        <p className="text-gray-700 text-sm truncate">
                                          {classroom.teacher?.name || "N/A"}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                        <p className="text-gray-600 text-sm truncate">
                                          {classroom.teacher?.email || "N/A"}
                                        </p>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <div className="flex items-center justify-center gap-1.5">
                                        <Users className="h-4 w-4 text-green-600" />
                                        <span className="text-gray-700 font-medium text-sm">
                                          {classroom.total_students || 0}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
                                        <CheckCircle className="h-3 w-3" />{" "}
                                        Enrolled
                                      </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                      <Button
                                        onClick={() =>
                                          openLeaveDialog(classroom)
                                        }
                                        disabled={leavingId === classroom.id}
                                        size="sm"
                                        className="bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md transition-all"
                                      >
                                        {leavingId === classroom.id ? (
                                          <span className="flex items-center gap-1.5">
                                            <svg
                                              className="animate-spin h-4 w-4"
                                              viewBox="0 0 24 24"
                                            >
                                              <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                fill="none"
                                              />
                                              <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                              />
                                            </svg>
                                            Leaving...
                                          </span>
                                        ) : (
                                          <>
                                            <LogOut className="h-4 w-4 mr-1.5" />
                                            Leave
                                          </>
                                        )}
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                        {/* Pagination */}
                        {enrolledClassrooms.length > itemsPerPage && (
                          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <p className="text-sm text-gray-600">
                              Showing{" "}
                              {(currentPageEnrolled - 1) * itemsPerPage + 1} to{" "}
                              {Math.min(
                                currentPageEnrolled * itemsPerPage,
                                enrolledClassrooms.length,
                              )}{" "}
                              of {enrolledClassrooms.length}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                onClick={() =>
                                  setCurrentPageEnrolled((prev) =>
                                    Math.max(prev - 1, 1),
                                  )
                                }
                                disabled={currentPageEnrolled === 1}
                                className="px-3 py-2 text-sm"
                              >
                                Previous
                              </Button>
                              <div className="flex items-center gap-1">
                                {Array.from({
                                  length: Math.ceil(
                                    enrolledClassrooms.length / itemsPerPage,
                                  ),
                                }).map((_, idx) => (
                                  <Button
                                    key={idx + 1}
                                    onClick={() =>
                                      setCurrentPageEnrolled(idx + 1)
                                    }
                                    className={`px-3 py-2 text-sm ${
                                      currentPageEnrolled === idx + 1
                                        ? "bg-purple-600 text-white"
                                        : "bg-white text-gray-600 border border-gray-300 hover:border-gray-400"
                                    }`}
                                  >
                                    {idx + 1}
                                  </Button>
                                ))}
                              </div>
                              <Button
                                onClick={() =>
                                  setCurrentPageEnrolled((prev) =>
                                    Math.min(
                                      prev + 1,
                                      Math.ceil(
                                        enrolledClassrooms.length /
                                          itemsPerPage,
                                      ),
                                    ),
                                  )
                                }
                                disabled={
                                  currentPageEnrolled ===
                                  Math.ceil(
                                    enrolledClassrooms.length / itemsPerPage,
                                  )
                                }
                                className="px-3 py-2 text-sm"
                              >
                                Next
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ============================================ */}
          {/* BROWSE TAB */}
          {/* ============================================ */}
          {activeTab === "browse" && (
            <div className="space-y-8">
              {/* Filter Section */}
              <Card className="border-0 shadow-lg overflow-hidden !p-0 mb-4">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Search className="h-5 w-5 text-blue-600" />
                    Search & Filter Classes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Class Name
                      </label>
                      <input
                        type="text"
                        placeholder="Search by class name..."
                        value={filterClassName}
                        onChange={(e) => setFilterClassName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Teacher Name
                      </label>
                      <input
                        type="text"
                        placeholder="Search by teacher name..."
                        value={filterTeacherName}
                        onChange={(e) => setFilterTeacherName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Teacher Email
                      </label>
                      <input
                        type="text"
                        placeholder="Search by teacher email..."
                        value={filterTeacherEmail}
                        onChange={(e) => setFilterTeacherEmail(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      />
                    </div>
                    <div className="md:col-span-1 flex items-end">
                      {(filterClassName ||
                        filterTeacherName ||
                        filterTeacherEmail) && (
                        <Button
                          onClick={clearFilters}
                          className="w-full bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center justify-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Classes Table */}
              <Card className="border-0 shadow-xl overflow-hidden !p-0">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                  <div className="flex items-center justify-between p-2">
                    <div>
                      <CardTitle className="text-xl">
                        Available Classes
                      </CardTitle>
                      <p className="text-blue-100 text-sm mt-2">
                        {loadingBrowse
                          ? "Loading..."
                          : `${filteredClassrooms.length} class${filteredClassrooms.length !== 1 ? "es" : ""} found`}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingBrowse ? (
                    <div className="p-8">
                      <TableSkeleton rows={6} cols={7} />
                    </div>
                  ) : filteredClassrooms.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                      <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-30" />
                      <p className="text-lg font-medium">
                        {allClassrooms.length === 0
                          ? "No classes available"
                          : "No classes match your filters"}
                      </p>
                      <p className="text-sm mt-2">
                        {allClassrooms.length === 0
                          ? "Check back later for new classes."
                          : "Try adjusting your search criteria."}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 border-b-2 border-gray-200">
                              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-32">
                                Class Name
                              </th>
                              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 flex-1">
                                Description
                              </th>
                              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-40">
                                Teacher
                              </th>
                              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 w-48">
                                Email
                              </th>
                              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 w-20">
                                Students
                              </th>
                              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 w-32">
                                Status
                              </th>
                              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 w-32">
                                Action
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredClassrooms
                              .slice(
                                (currentPageBrowse - 1) * itemsPerPage,
                                currentPageBrowse * itemsPerPage,
                              )
                              .map((classroom) => (
                                <tr
                                  key={classroom.id}
                                  className="hover:bg-blue-50/50 transition-colors"
                                >
                                  <td className="px-6 py-4">
                                    <p className="font-semibold text-gray-900 truncate">
                                      {classroom.name}
                                    </p>
                                  </td>
                                  <td className="px-6 py-4">
                                    <p className="text-gray-600 text-sm line-clamp-2">
                                      {classroom.description || (
                                        <span className="text-gray-400 italic">
                                          No description
                                        </span>
                                      )}
                                    </p>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <GraduationCap className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                      <p className="text-gray-700 text-sm truncate">
                                        {classroom.teacher_name || "N/A"}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                      <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                      <p className="text-gray-600 text-sm truncate">
                                        {classroom.teacher_email || "N/A"}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <Users className="h-4 w-4 text-green-600" />
                                      <span className="text-gray-700 font-medium text-sm">
                                        {classroom.student_count || 0}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    {getStatusBadge(
                                      classroom.enrollment_status,
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    {getRequestButton(classroom)}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Pagination */}
                      {filteredClassrooms.length > itemsPerPage && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                          <p className="text-sm text-gray-600">
                            Showing {(currentPageBrowse - 1) * itemsPerPage + 1}{" "}
                            to{" "}
                            {Math.min(
                              currentPageBrowse * itemsPerPage,
                              filteredClassrooms.length,
                            )}{" "}
                            of {filteredClassrooms.length}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              onClick={() =>
                                setCurrentPageBrowse((prev) =>
                                  Math.max(prev - 1, 1),
                                )
                              }
                              disabled={currentPageBrowse === 1}
                              className="px-3 py-2 text-sm"
                            >
                              Previous
                            </Button>
                            <div className="flex items-center gap-1">
                              {Array.from({
                                length: Math.ceil(
                                  filteredClassrooms.length / itemsPerPage,
                                ),
                              }).map((_, idx) => (
                                <Button
                                  key={idx + 1}
                                  onClick={() => setCurrentPageBrowse(idx + 1)}
                                  className={`px-3 py-2 text-sm ${
                                    currentPageBrowse === idx + 1
                                      ? "bg-blue-600 text-white"
                                      : "bg-white text-gray-600 border border-gray-300 hover:border-gray-400"
                                  }`}
                                >
                                  {idx + 1}
                                </Button>
                              ))}
                            </div>
                            <Button
                              onClick={() =>
                                setCurrentPageBrowse((prev) =>
                                  Math.min(
                                    prev + 1,
                                    Math.ceil(
                                      filteredClassrooms.length / itemsPerPage,
                                    ),
                                  ),
                                )
                              }
                              disabled={
                                currentPageBrowse ===
                                Math.ceil(
                                  filteredClassrooms.length / itemsPerPage,
                                )
                              }
                              className="px-3 py-2 text-sm"
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={showLeaveDialog}
        onOpenChange={(open) => {
          setShowLeaveDialog(open);
          if (!open) {
            setSelectedClassroomForLeave(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave Classroom</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave class{" "}
              <span className="font-semibold text-gray-900">
                {selectedClassroomForLeave?.name || "this class"}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowLeaveDialog(false);
                setSelectedClassroomForLeave(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={leavingId === selectedClassroomForLeave?.id}
              onClick={confirmLeaveClassroom}
            >
              {leavingId === selectedClassroomForLeave?.id
                ? "Leaving..."
                : "Leave"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
