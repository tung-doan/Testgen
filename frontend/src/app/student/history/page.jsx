"use client";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useSubmission } from "@/hooks/useSubmission";

export default function StudentHistory() {
  const { getMySubmissions } = useSubmission() || {};
  const [subs, setSubs] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        if (getMySubmissions) {
          const data = await getMySubmissions();
          setSubs(data || []);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [getMySubmissions]);

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Submission History</CardTitle>
            </CardHeader>
            <CardContent>
              {subs.length === 0 ? (
                <p>No submissions yet.</p>
              ) : (
                <ul className="space-y-2">
                  {subs.map((s) => (
                    <li key={s.id} className="p-2 border rounded">
                      <div className="font-semibold">
                        {s.participant_name || s.student_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {s.created_at}
                      </div>
                      <div className="text-sm">Score: {s.score}</div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
