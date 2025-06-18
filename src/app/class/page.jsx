"use client";
import React, { useState, useEffect } from "react";
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
import axios from "axios";

export default function Class() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}classroom/`,
          { withCredentials: true }
        );
        setClasses(response.data);
        console.log("Classes:", response.data);
        setError(null);
      } catch (err) {
        console.error("Error fetching classes:", err);
        setError("Failed to load classes. Please try again.");
        if (err.response?.status === 401) {
          window.location.href = "/login";
        }
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  const handleDeleteClass = async (classId) => {
    if (window.confirm("Are you sure you want to delete this class?")) {
      try {
        await axios.delete(
          `${process.env.NEXT_PUBLIC_API_URL}/classroom/${classId}/`,
          { withCredentials: true }
        );
        setClasses(classes.filter((cls) => cls.id !== classId));
        alert("Class deleted successfully!");
      } catch (err) {
        console.error("Error deleting class:", err);
        setError("Failed to delete class. Please try again.");
        if (err.response?.status === 401) {
          window.location.href = "/login";
        }
      }
    }
  };

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200 p-4">
        <Card className="w-full max-w-4xl shadow-xl border-0 transition-transform hover:scale-[1.02]">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg flex justify-between items-center">
            <CardTitle className="text-2xl font-semibold">
              Your Classes
            </CardTitle>
            <Link href="/class/create-class">
              <Button className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition-colors duration-200">
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
                <h1 className="text-3xl text-gray-700 text-center font-normal">
                  You haven't created any class yet.
                </h1>
                <Link href="/class/create-class">
                  <Button className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition-colors duration-200">
                    Create One
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-700 font-semibold">
                      Class Name
                    </TableHead>
                    <TableHead className="text-gray-700 font-semibold">
                      Description
                    </TableHead>
                    <TableHead className="text-gray-700 font-semibold">
                      Teacher
                    </TableHead>
                    <TableHead className="text-gray-700 font-semibold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((classroom) => (
                    <TableRow key={classroom.id} className="hover:bg-gray-50 transition-color cursor-pointer" onClick={() => window.location.href = `/class/${classroom.id}`}>
                      <TableCell>{classroom.name}</TableCell>
                      <TableCell>{classroom.description || "N/A"}</TableCell>
                      <TableCell>{classroom.teacher}</TableCell>
                      <TableCell>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click
                            handleDeleteClass(classroom.id)
                          }}
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
    </>
  );
}