"use client";

import { useState, useEffect } from "react";
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
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import LoadingScreen from "../loading";

export default function TestSummary() {
  const router = useRouter();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  const fetchTestSummary = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        process.env.NEXT_PUBLIC_API_URL + "/api/tests/test_summary/",
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      setTests(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching test summary:", err);
      setError("Failed to load test summary. Please try again.");
      if (err.response?.status === 401) {
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestSummary();
  }, []);

  useEffect(() => {
    if (localStorage.getItem("newTestCreated") === "true") {
      fetchTestSummary();
      localStorage.removeItem("newTestCreated");
    }
  }, []);
 

  const handleCreateTest = () => {
    window.location.href = "/create-test";
  };

  // Pagination logic
  const totalPages = Math.ceil(tests.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentTests = tests.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    setCurrentPage(page);
  };

  const pageNumbers = [];
  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <>
    <Header />
    <Navbar />
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200 p-4">
      <Card className="w-full max-w-4xl shadow-xl border-0 transition-transform hover:scale-[1.02]">
        <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg flex justify-between items-center">
          <CardTitle className="text-2xl font-semibold">Test Summary</CardTitle>
          <div className="flex space-x-2">
            <Button
              onClick={handleCreateTest}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded-lg transition-colors duration-200 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Create Test
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <LoadingScreen />
          ) : error ? (
            <p className="text-center text-red-600">{error}</p>
          ) : tests.length === 0 ? (
            <p className="text-center text-gray-600">No tests found.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold text-gray-700">
                      Test Name
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Number of Participants
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Date Created
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Average Score
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTests.map((test) => (
                    <TableRow
                      key={test.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={()=> {router.push(`/quiz/${test.id}`)}}
                    >
                      <TableCell>{test.name}</TableCell>
                      <TableCell>{test.num_participants}</TableCell>
                      <TableCell>{test.date_created}</TableCell>
                      <TableCell>{test.average_score}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-1 px-3 rounded-lg transition-colors duration-200 disabled:bg-gray-400"
                >
                  Previous
                </Button>
                <div className="flex space-x-2">
                  {pageNumbers.map((page) => (
                    <Button
                      key={page}
                      onClick={() => handlePageClick(page)}
                      className={`${
                        currentPage === page
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      } font-medium py-1 px-3 rounded-lg transition-colors duration-200`}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-1 px-3 rounded-lg transition-colors duration-200 disabled:bg-gray-400"
                >
                  Next
                </Button>
              </div>
              <p className="text-gray-600 text-sm mt-2">
                Page {currentPage} of {totalPages} (Total Tests: {tests.length})
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}
