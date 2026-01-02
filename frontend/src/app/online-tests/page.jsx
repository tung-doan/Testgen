"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import LoadingScreen from "@/app/loading";
import OnlineExamService from "@/services/onlineExam.service";
import {
  Monitor,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  Clock,
  BarChart3,
  Search,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export default function ManageOnlineTests() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exams, setExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await OnlineExamService.getExams();
      setExams(data);
    } catch (err) {
      console.error("Error loading exams:", err);
      setError("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    router.push("/create-test/online");
  };

  const handleViewDetails = (examId) => {
    router.push(`/online-tests/${examId}`);
  };

  const handleViewAttempts = (examId) => {
    router.push(`/online-tests/${examId}/attempts`);
  };

  const handleViewStatistics = (examId) => {
    router.push(`/online-tests/${examId}/statistics`);
  };

  // ✅ Removed handleDuplicate function

  const confirmDelete = (exam) => {
    setExamToDelete(exam);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!examToDelete) return;

    try {
      setLoading(true);
      await OnlineExamService.deleteExam(examToDelete.id);
      alert("Exam deleted successfully!");
      await loadExams();
    } catch (err) {
      console.error("Error deleting exam:", err);
      alert("Failed to delete exam: " + err.message);
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setExamToDelete(null);
    }
  };

  const filteredExams = exams.filter((exam) =>
    exam.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && !exams.length) {
    return <LoadingScreen message="Loading exams..." />;
  }

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <Card className="border-0 shadow-xl overflow-hidden mb-4 !p-0">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-0 m-0">
              <div className="flex items-center justify-between px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <Monitor className="h-8 w-8" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl">
                      Manage Online Tests
                    </CardTitle>
                    <p className="text-blue-100 mt-1">
                      View, edit, and manage your online exams
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleCreateNew}
                  className="bg-white text-blue-700 hover:bg-blue-50 flex items-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Create New Test
                </Button>
              </div>
            </CardHeader>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Search and Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <Card className="col-span-1 md:col-span-2 border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search exams by title..."
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Total Tests */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Tests</p>
                    <p className="text-3xl font-bold">{exams.length}</p>
                  </div>
                  <Monitor className="h-8 w-8 opacity-80" />
                </div>
              </CardContent>
            </Card>

            {/* Active Tests */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Active</p>
                    <p className="text-3xl font-bold">{filteredExams.length}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Exams Table */}
          <Card className="border-0 shadow-xl !p-0">
            <CardHeader className="border-b bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 p-3">
                <Monitor className="h-5 w-5 text-blue-600" />
                Online Exams ({filteredExams.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {filteredExams.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Monitor className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg mb-2">
                    {searchTerm
                      ? "No exams found"
                      : "No online exams created yet"}
                  </p>
                  <p className="text-sm mb-4">
                    {searchTerm
                      ? "Try a different search term"
                      : "Create your first online exam to get started"}
                  </p>
                  {!searchTerm && (
                    <Button
                      onClick={handleCreateNew}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Online Test
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-bold">Title</TableHead>
                        <TableHead className="font-bold text-center">
                          Class
                        </TableHead>
                        <TableHead className="font-bold text-center">
                          Questions
                        </TableHead>
                        <TableHead className="font-bold text-center">
                          Duration
                        </TableHead>
                        <TableHead className="font-bold text-center">
                          Attempts
                        </TableHead>
                        <TableHead className="font-bold text-center">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExams.map((exam) => (
                        <TableRow
                          key={exam.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Monitor className="h-4 w-4 text-blue-600" />
                              {exam.title}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {exam.classroom_name ? (
                              <Badge variant="outline" className="bg-blue-50">
                                <Users className="h-3 w-3 mr-1" />
                                {exam.classroom_name}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-sm">
                                No class
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-purple-100 text-purple-800">
                              {exam.total_questions || 0} questions
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1 text-gray-600">
                              <Clock className="h-4 w-4" />
                              {exam.duration_minutes} min
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-green-100 text-green-800">
                              Max {exam.max_attempts}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewDetails(exam.id)}
                                className="hover:bg-blue-50 cursor-pointer"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {/* <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewAttempts(exam.id)}
                                className="hover:bg-green-50"
                                title="View Attempts"
                              >
                                <Users className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewStatistics(exam.id)}
                                className="hover:bg-purple-50"
                                title="Statistics"
                              >
                                <BarChart3 className="h-4 w-4" />
                              </Button> */}
                              {/* ✅ Removed Duplicate button */}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => confirmDelete(exam)}
                                className="hover:bg-red-600 cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Online Exam</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{examToDelete?.title}"? This
              action cannot be undone and will remove all associated attempts
              and results.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
