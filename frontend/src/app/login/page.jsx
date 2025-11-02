"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import LoadingScreen from "../loading";

export default function LoginPage() {
  const router = useRouter();
  const { login, actionLoading, authError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!username || !password) {
      setFormError("Please fill in all fields");
      return;
    }

    try {
      await login(username, password);
      router.push("/class");
    } catch (error) {
      setFormError(error.message || "Login failed");
    }
  };

  return (
    <>
      {actionLoading && <LoadingScreen message="Signing in..." />}
      <Header />
      <div className="flex justify-center items-center min-h-screen bg-[#f3f7f5] p-6">
        <Card className="w-full max-w-xl p-8 rounded-3xl shadow-xl bg-white border-none">
          <h1 className="text-4xl font-bold text-center mb-8">Log in</h1>
          <CardContent className="space-y-6">
            {(formError || authError) && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md border border-red-200">
                {formError || authError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="block text-lg font-semibold"
                >
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={actionLoading}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-lg font-semibold"
                >
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={actionLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full py-6 mt-4 bg-[#00d663] hover:bg-[#00c058] rounded-full text-xl font-semibold"
                disabled={actionLoading}
              >
                {actionLoading ? "Signing in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
