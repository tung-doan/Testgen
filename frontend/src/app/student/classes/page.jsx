"use client";
import Header from "@/components/Header";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClassroom } from "@/hooks/useClassroom";
import { useEffect, useState } from "react";

export default function StudentClasses() {
  const { getAllClassrooms } = useClassroom() || {};
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        if (getAllClassrooms) {
          const data = await getAllClassrooms();
          setClasses(data || []);
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [getAllClassrooms]);

  return (
    <>
      <Header />
      <Navbar />
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Your Classes</CardTitle>
            </CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <p>No classes found.</p>
              ) : (
                <ul className="space-y-2">
                  {classes.map((c) => (
                    <li key={c.id} className="p-2 border rounded">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-sm text-gray-600">
                        {c.description}
                      </div>
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
