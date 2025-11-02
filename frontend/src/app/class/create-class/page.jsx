"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { useClassroom } from "@/hooks/useClassroom";

export default function CreateClass() {
  const router = useRouter();
  const { createClassroom, loading } = useClassroom();
  const [className, setClassName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!className) {
      setError("Please fill in class name");
      return;
    }

    try {
      await createClassroom({
        name: className,
        description: description,
      });
      alert("Class created successfully!");
      router.push("/class");
    } catch (err) {
      console.error("Error creating class:", err);
      setError(err.message);
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
                <Label htmlFor="className">Class Name</Label>
                <Input
                  id="className"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="mt-1 w-full"
                  placeholder="e.g., Math 101"
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full"
                  placeholder="Enter class description"
                  rows={4}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
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
