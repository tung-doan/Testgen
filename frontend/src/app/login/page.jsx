"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { User, Lock, GraduationCap } from "lucide-react";
import { LoginSkeleton } from "@/components/ui/skeletons";

export default function LoginPage() {
  const router = useRouter();
  const { login, actionLoading, authError, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!username || !password) {
      setFormError("Please fill in all fields");
      return;
    }

    try {
      setIsNavigating(true);
      // Trigger progress bar ngay khi bắt đầu login
      window.dispatchEvent(new Event("navigation-start"));
      await login({ username, password }, false);
      router.push("/class");
    } catch (error) {
      // Nếu lỗi thì kết thúc progress bar
      window.dispatchEvent(new Event("navigation-end"));
      setIsNavigating(false);
      setFormError(error.message || "Login failed");
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6">
          <LoginSkeleton />
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6">
        <Card className="w-full max-w-lg p-10 rounded-2xl shadow-2xl bg-white border-0 hover:shadow-3xl transition-all duration-300">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mb-4 shadow-lg">
              <User className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to continue to TestGen</p>
          </div>

          <CardContent className="space-y-6">
            {/* Error Message */}
            {(formError || authError) && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 flex items-start gap-3">
                <div className="bg-red-100 rounded-full p-1">
                  <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm font-medium">{formError || authError}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username Field */}
              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={actionLoading}
                    className="pl-10 h-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={actionLoading}
                    className="pl-10 h-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                    placeholder="Enter your password"
                  />
                </div>
                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

               {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 mt-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg text-base font-semibold shadow-lg hover:shadow-xl hover:cursor-pointer transition-all duration-300"
                disabled={actionLoading || isNavigating}
              >
                {actionLoading || isNavigating ? "Signing in..." : "Login"}
              </Button>
            </form>

            {/* Student Login Link */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">Are you a student?</p>
                <Link href="/student/login">
                  <Button
                    variant="outline"
                    className="w-full h-11 border-2 border-blue-500 text-blue-600 hover:bg-blue-50 rounded-lg font-semibold transition-all duration-300 group hover:cursor-pointer"
                  >
                    <GraduationCap className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
                    Login as Student
                  </Button>
                </Link>
              </div>
            </div>

            {/* Sign Up Link */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link href="/register" className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}