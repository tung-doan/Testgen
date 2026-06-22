"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, Lock, Mail, ArrowLeft } from "lucide-react";
import { LoginSkeleton } from "@/components/ui/skeletons";

export default function StudentLogin() {
  const router = useRouter();
  const { login, actionLoading, authError, loading } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    try {
      setIsNavigating(true);
      // Trigger progress bar ngay khi bắt đầu login
      window.dispatchEvent(new Event("navigation-start"));
      
      await login(
        { identifier, password },
        true // isStudentLogin = true
      );

      // Redirect to student dashboard
      router.push("/student/dashboard");
    } catch (err) {
      // Nếu lỗi thì kết thúc progress bar
      window.dispatchEvent(new Event("navigation-end"));
      setIsNavigating(false);
      setFormError(err.message || "Invalid email/username or password");
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
          <LoginSkeleton />
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        <Card className="w-full max-w-lg p-10 rounded-2xl shadow-2xl bg-white border-0 hover:shadow-3xl transition-all duration-300">
          {/* Back Button */}
          <Link
            href="/login"
            className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-6 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Teacher Login</span>
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 mb-4 shadow-lg">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Student Portal
            </h1>
            <p className="text-gray-600">
              Enter your credentials to access your account
            </p>
          </div>

          <CardContent className="space-y-6">
            {/* Error Message */}
            {(formError || authError) && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 flex items-start gap-3">
                <div className="bg-red-100 rounded-full p-1">
                  <svg
                    className="h-5 w-5 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <span className="text-sm font-medium">
                  {formError || authError}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email or Username Field */}
              <div className="space-y-2">
                <label
                  htmlFor="identifier"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Email or Username
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={actionLoading}
                    className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                    placeholder="Enter your email or username"
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
                    className="pl-10 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                    placeholder="Enter your password"
                  />
                </div>
                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 mt-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg text-base font-semibold shadow-lg hover:shadow-xl hover:cursor-pointer transition-all duration-300"
                disabled={actionLoading || isNavigating}
              >
                {actionLoading || isNavigating ? "Logging in..." : "Login as Student"}
              </Button>
            </form>

            {/* Help Text */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> If you don't know your password, please
                contact your teacher to get your login credentials.
              </p>
            </div>

            {/* Register Link */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link
                  href="/student/register"
                  className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                >
                  Register here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
