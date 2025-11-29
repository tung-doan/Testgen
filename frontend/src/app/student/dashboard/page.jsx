"use client";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StudentDashboard() {
  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Welcome — overview, quick stats and links to History / Classes /
                Pending tests.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
