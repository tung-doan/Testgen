import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Mail,
  GraduationCap,
} from "lucide-react";
import ClassroomService from "@/services/classroom.service";

export default function ClassroomDetailModal({
  open,
  onClose,
  classroom,
  studentId,
}) {
  const [classmates, setClassmates] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    has_next: false,
    has_prev: false,
  });
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (open && classroom) {
      fetchClassroomDetail(1);
    }
  }, [open, classroom]);

  const fetchClassroomDetail = async (page) => {
    try {
      setLoading(true);
      const response = await ClassroomService.getClassroomDetail(
        classroom.id,
        studentId,
        page,
        20 // page_size
      );

      setClassmates(response.classmates.data);
      setPagination(response.classmates.pagination);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching classroom detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      fetchClassroomDetail(newPage);
    }
  };

  const getScoreBadgeClass = (score) => {
    if (!score) return "bg-gray-100 text-gray-800 border-gray-200";
    if (score >= 8) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 6.5) return "bg-blue-100 text-blue-800 border-blue-200";
    if (score >= 5) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  if (!classroom) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          {/* Classroom Info */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6 rounded-lg mb-4 -mx-6 -mt-6">
            <DialogTitle className="text-3xl mb-2">
              {classroom.name}
            </DialogTitle>
            {classroom.description && (
              <DialogDescription className="text-purple-100 text-base">
                {classroom.description}
              </DialogDescription>
            )}

            {/* Teacher & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="flex items-center gap-2 bg-white/10 p-3 rounded-lg">
                <GraduationCap className="h-5 w-5" />
                <div>
                  <p className="text-xs text-purple-100">Teacher</p>
                  <p className="font-semibold">
                    {classroom.teacher?.name || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/10 p-3 rounded-lg">
                <Mail className="h-5 w-5" />
                <div>
                  <p className="text-xs text-purple-100">Email</p>
                  <p className="font-semibold text-sm break-all">
                    {classroom.teacher?.email || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Classmates Header */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Classmates</h3>
                <p className="text-sm text-gray-600">
                  {pagination.total_items} students in this class
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Classmates Table */}
        <div className="mt-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading classmates...</p>
            </div>
          ) : classmates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>No classmates found</p>
            </div>
          ) : (
            <>
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
                  {classmates.map((classmate) => (
                    <TableRow
                      key={classmate.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        classmate.is_current_user
                          ? "bg-blue-50 border-l-4 border-blue-500"
                          : ""
                      }`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {classmate.is_current_user && (
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

              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Showing {classmates.length} of {pagination.total_items}{" "}
                    students
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={!pagination.has_prev || loading}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>

                    <span className="text-sm font-medium px-3">
                      Page {currentPage} of {pagination.total_pages}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={!pagination.has_next || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
