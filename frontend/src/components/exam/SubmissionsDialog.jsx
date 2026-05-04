import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import OnlineExamService from "@/services/onlineExam.service";
import {
  Clock,
  Users,
  CheckCircle,
  Search,
  Trophy,
  Mail,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function SubmissionsDialog({ examId, examTitle }) {
  const [isOpen, setIsOpen] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  const loadAttempts = async () => {
    try {
      const data = await OnlineExamService.getExamAttempts(examId);
      // Sort by student name by default
      const sorted = [...data].sort((a, b) => {
        const nameA = (a.student_name || "").toLowerCase();
        const nameB = (b.student_name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setAttempts(sorted);
    } catch (err) {
      console.error("Error loading attempts:", err);
      setAttempts([]);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setSearchTerm("");
    setCurrentPage(1);
    loadAttempts();
  };

  // Filter attempts by search term
  const filteredAttempts = attempts.filter((a) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (a.student_name || "").toLowerCase().includes(q) ||
      (a.student_email || "").toLowerCase().includes(q)
    );
  });

  // Pagination for attempts
  const totalPages = Math.ceil(filteredAttempts.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentAttempts = filteredAttempts.slice(
    startIndex,
    startIndex + rowsPerPage,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getScoreColor = (score) => {
    if (score === null || score === undefined) return "text-gray-400";
    if (score >= 8) return "text-green-600";
    if (score >= 5) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusBadge = (status) => {
    if (status === "COMPLETED") {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-800">
        <Clock className="h-3 w-3 mr-1" />
        In Progress
      </Badge>
    );
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        size="lg"
        className="bg-white cursor-pointer hover:bg-gray-100 text-indigo-700 font-bold px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 gap-3 border border-indigo-100/30 backdrop-blur-sm"
      >
        <span className="text-lg">View Submissions</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[1200px] w-full max-h-[85vh] overflow-y-auto !p-0">
          <DialogHeader className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-6 py-5 rounded-t-lg sticky top-0 z-10">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Submissions — {examTitle}
            </DialogTitle>
            <DialogDescription className="text-blue-100 mt-1">
              {attempts.length} submission{attempts.length !== 1 ? "s" : ""} total
              · Sorted by student name
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="px-6 pt-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by name or email..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Table */}
          <div className="px-0">
            { filteredAttempts.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">
                  {searchTerm
                    ? "No matching submissions found"
                    : "No submissions yet"}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {searchTerm
                    ? "Try a different search term"
                    : "Students haven't taken this exam yet"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80">
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-3">
                          <div className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            Name
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-3">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            Email
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-3 text-center">
                          Score
                        </TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-3 text-center">
                          Status
                        </TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-3 text-center">
                          Duration
                        </TableHead>
                        <TableHead className="font-semibold text-gray-600 text-xs uppercase tracking-wider px-6 py-3">
                          Submitted
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentAttempts.map((attempt, index) => (
                        <TableRow
                          key={attempt.id}
                          className={`hover:bg-blue-50/60 transition-all duration-150 border-b border-gray-100 ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                          }`}
                        >
                          <TableCell className="px-6 py-3 font-medium text-gray-900">
                            {attempt.student_name || "-"}
                          </TableCell>
                          <TableCell className="px-6 py-3 text-gray-600 text-sm">
                            {attempt.student_email || "-"}
                          </TableCell>
                          <TableCell className="px-6 py-3 text-center">
                            <span
                              className={`text-lg font-bold ${getScoreColor(attempt.final_score)}`}
                            >
                              {attempt.final_score !== null &&
                              attempt.final_score !== undefined
                                ? attempt.final_score.toFixed(1)
                                : "-"}
                            </span>
                            {attempt.final_score !== null && (
                              <span className="text-xs text-gray-400">
                                /10
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-3 text-center">
                            {getStatusBadge(attempt.status)}
                          </TableCell>
                          <TableCell className="px-6 py-3 text-center text-sm text-gray-600">
                            {attempt.duration_taken
                              ? `${attempt.duration_taken} min`
                              : "-"}
                          </TableCell>
                          <TableCell className="px-6 py-3 text-sm text-gray-500">
                            {formatDate(attempt.end_time)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center px-6 py-3 border-t border-gray-100 bg-gray-50/50">
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                      className="gap-1 text-sm bg-white"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages} ·{" "}
                      {filteredAttempts.length} result
                      {filteredAttempts.length !== 1 ? "s" : ""}
                    </span>
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, totalPages),
                        )
                      }
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                      className="gap-1 text-sm bg-white"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
