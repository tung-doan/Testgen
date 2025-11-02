"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import LoadingScreen from "../loading";
import { useTest } from "@/hooks/useTest";

export default function TestSummary() {
  const router = useRouter();
  const { getTestSummary, loading, error } = useTest();
  const [tests, setTests] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  useEffect(() => {
    fetchTests();
  }, []);

  useEffect(() => {
    if (localStorage.getItem("newTestCreated") === "true") {
      fetchTests();
      localStorage.removeItem("newTestCreated");
    }
  }, []);

  const fetchTests = async () => {
    try {
      const data = await getTestSummary();
      setTests(data);
    } catch (err) {
      console.error("Error fetching tests:", err);
      if (err.message === "UNAUTHORIZED") {
        router.push("/login");
      }
    }
  };

  const handleCreateTest = () => {
    router.push("/create-test");
  };

  const handleTestClick = (testId) => {
    router.push(`/quiz/${testId}`);
  };

  // Pagination
  const totalPages = Math.ceil(tests.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentTests = tests.slice(startIndex, startIndex + rowsPerPage);

  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  const pageNumbers = [];
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
            <CardTitle className="text-2xl font-semibold">
              Test Summary
            </CardTitle>
            <Button
              onClick={handleCreateTest}
              className="bg-blue-600 hover:bg-blue-700 text-white"
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
                        Participants
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
                        onClick={() => handleTestClick(test.id)}
                      >
                        <TableCell>{test.name}</TableCell>
                        <TableCell>{test.num_participants}</TableCell>
                        <TableCell>{test.date_created}</TableCell>
                        <TableCell>{test.average_score}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-4">
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="bg-gray-600 hover:bg-gray-700"
                    >
                      Previous
                    </Button>
                    <div className="flex space-x-2">
                      {pageNumbers.map((page) => (
                        <Button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={
                            currentPage === page
                              ? "bg-green-600"
                              : "bg-gray-200 text-gray-700"
                          }
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="bg-gray-600 hover:bg-gray-700"
                    >
                      Next
                    </Button>
                  </div>
                )}

                <p className="text-gray-600 text-sm mt-2 text-center">
                  Page {currentPage} of {totalPages} (Total: {tests.length})
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
