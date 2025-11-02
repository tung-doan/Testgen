"use client";

import { useState, useEffect } from "react";
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
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useClassroom } from "@/hooks/useClassroom";

export default function Class() {
  const router = useRouter();
  const { getAllClassrooms, deleteClassroom, loading, error } = useClassroom();
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const data = await getAllClassrooms();
      setClasses(data);
    } catch (err) {
      console.error("Error fetching classes:", err);
      if (err.message === "UNAUTHORIZED") {
        router.push("/login");
      }
    }
  };

  const handleDeleteClass = async (classId, e) => {
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this class?")) {
      return;
    }

    try {
      await deleteClassroom(classId);
      setClasses(classes.filter((c) => c.id !== classId));
      alert("Class deleted successfully!");
    } catch (err) {
      console.error("Error deleting class:", err);
      alert("Failed to delete class.");
    }
  };

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 p-4">
        <Card className="w-full max-w-5xl shadow-xl border-0 transition-transform hover:scale-[1.02]">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg flex justify-between items-center">
            <CardTitle className="text-2xl font-semibold">
              Your Classes
            </CardTitle>
            <Link href="/class/create-class">
              <Button className="bg-green-600 hover:bg-green-700">
                Create New Class
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <p className="text-center text-gray-600">Loading...</p>
            ) : error ? (
              <p className="text-center text-red-600">{error}</p>
            ) : classes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4">
                <h1 className="text-3xl text-gray-700 text-center">
                  You haven't created any class yet.
                </h1>
                <Link href="/class/create-class">
                  <Button className="bg-green-600 hover:bg-green-700">
                    Create One
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Class Name</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold">Teacher</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((classroom) => (
                    <TableRow
                      key={classroom.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/class/${classroom.id}`)}
                    >
                      <TableCell>{classroom.name}</TableCell>
                      <TableCell>{classroom.description || "N/A"}</TableCell>
                      <TableCell>{classroom.teacher}</TableCell>
                      <TableCell>
                        <Button
                          onClick={(e) => handleDeleteClass(classroom.id, e)}
                          className="bg-red-600 hover:bg-red-700"
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
    </>
  );
}
