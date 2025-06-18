"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";

export default function CreateClass() {
  const router = useRouter();
  const [className, setClassName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!className) {
      setError("Please fill in class name");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}classroom/`,
        {
          name: className,
          description: description,
        },
        { withCredentials: true }
      );
      alert("Class created successfully!");
      router.push(`/class`);
    } catch (err) {
      console.error("Error creating class:", err);
      setError(err.response?.data?.error || "Failed to create class.");
      if (err.response?.status === 401) {
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 p-4">
        <Card className="w-full max-w-md shadow-xl border-0 transition-transform hover:scale-[1.02]">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl font-semibold text-center">
              Create New Class
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-red-600 text-center">{error}</p>}
              <div>
                <Label htmlFor="className" className="block text-sm font-medium text-gray-700">
                  Class Name
                </Label>
                <Input
                  id="className"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="mt-1 w-full"
                  placeholder="Enter class name"
                  required
                />
              </div>
              <div className="mb-4">
                <Label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full"
                  placeholder="Enter description (optional)"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition-colors duration-200 disabled:bg-gray-400"
              >
                {loading ? "Creating..." : "Create Class"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}