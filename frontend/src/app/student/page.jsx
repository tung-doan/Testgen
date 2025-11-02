"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";

export default function Students() {
  const searchParams = useSearchParams(); // Lấy tham số từ URL
  const [searchName, setSearchName] = useState(searchParams.get("name") || "");
  const [searchClass, setSearchClass] = useState(searchParams.get("class") || "");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Hàm tìm kiếm sinh viên
  const fetchStudents = async (name = searchName, className = searchClass) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (name) params.append("name", name);
      if (className) params.append("class", className);

      const response = await axios.get(
        `api/submissions/student_details/?${params.toString()}`,
        { withCredentials: true }
      );

      setStudents(response.data);
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("Failed to load students. Please try again.");
      if (err.response?.status === 401) {
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  // Tự động tìm kiếm nếu URL có tham số name hoặc class
  useEffect(() => {
    if (searchParams.get("name") || searchParams.get("class")) {
      fetchStudents(searchParams.get("name"), searchParams.get("class"));
    }
  }, [searchParams]);

  // Xử lý tìm kiếm thủ công
  const handleSearch = () => {
    fetchStudents(searchName, searchClass);

    // Cập nhật URL mà không tải lại trang
    const newParams = new URLSearchParams();
    if (searchName) newParams.set("name", searchName);
    if (searchClass) newParams.set("class", searchClass);
    window.history.pushState({}, "", `/student?${newParams.toString()}`);
  };

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200 p-4">
        <Card className="w-full max-w-4xl shadow-xl border-0 transition-transform hover:scale-[1.02]">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-semibold">
              Students
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {/* Thanh tìm kiếm */}
            <div className="flex space-x-4 mb-6">
              <div className="flex-1">
                <Label
                  htmlFor="searchName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Student Name
                </Label>
                <Input
                  id="searchName"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Enter student name"
                  className="mt-1 w-full rounded-lg border-gray-300"
                />
              </div>
              <div className="flex-1">
                <Label
                  htmlFor="searchClass"
                  className="block text-sm font-medium text-gray-700"
                >
                  Class
                </Label>
                <Input
                  id="searchClass"
                  value={searchClass}
                  onChange={(e) => setSearchClass(e.target.value)}
                  placeholder="Enter class (e.g., 12A)"
                  className="mt-1 w-full rounded-lg border-gray-300"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSearch}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Search
                </Button>
              </div>
            </div>

            {/* Bảng hiển thị sinh viên */}
            {loading ? (
              <p className="text-center text-gray-600">Loading...</p>
            ) : error ? (
              <p className="text-center text-red-600">{error}</p>
            ) : students.length === 0 ? (
              <p className="text-center text-gray-600">
                No results found. Try adjusting your search.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700">
                      Student Name
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Class
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      MSSV
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Score
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Submission Image
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow
                      key={student.submission_image}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <TableCell>{student.student_name}</TableCell>
                      <TableCell>{student.class_name}</TableCell>
                      <TableCell>{student.mssv}</TableCell>
                      <TableCell>{student.score}</TableCell>
                      <TableCell>
                        {student.submission_image ? (
                          <a
                            href={`http://127.0.0.1:8000${student.submission_image}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Image
                              src={`http://127.0.0.1:8000${student.submission_image}`}
                              alt="Submission"
                              width={100}
                              height={100}
                              className="object-cover rounded-md"
                              onError={() =>
                                console.error(
                                  "Failed to load image:",
                                  student.submission_image
                                )
                              }
                            />
                          </a>
                        ) : (
                          <span className="text-gray-500">No Image</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}