"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import {
  GraduationCap,
  Lock,
  Mail,
  User,
  Calendar,
  ArrowLeft,
  UserPlus,
} from "lucide-react";
import axios from "axios";

export default function StudentRegister() {
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    confirm_password: "",
    date_of_birth: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});

    // Client-side validation
    if (
      !formData.name ||
      !formData.email ||
      !formData.username ||
      !formData.password ||
      !formData.confirm_password
    ) {
      setFormError("Please fill in all required fields.");
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setFieldErrors({ confirm_password: "Passwords do not match" });
      return;
    }

    if (formData.password.length < 6) {
      setFieldErrors({
        password: "Password must be at least 6 characters long",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        name: formData.name,
        email: formData.email,
        username: formData.username,
        password: formData.password,
        confirm_password: formData.confirm_password,
      };

      if (formData.date_of_birth) {
        payload.date_of_birth = formData.date_of_birth;
      }

      const response = await axios.post(
        `${apiUrl}users/student-register/`,
        payload,
        { withCredentials: true }
      );

      const data = response.data;

      // Auto-login: store user & student data
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      if (data.student) {
        localStorage.setItem("student", JSON.stringify(data.student));
      }

      window.dispatchEvent(new Event("navigation-start"));
      router.push("/student/dashboard");
    } catch (error) {
      if (error.response?.data) {
        const errData = error.response.data;
        // Handle field-specific errors
        const newFieldErrors = {};
        for (const key of Object.keys(errData)) {
          if (Array.isArray(errData[key])) {
            newFieldErrors[key] = errData[key][0];
          } else if (typeof errData[key] === "string") {
            newFieldErrors[key] = errData[key];
          }
        }
        if (Object.keys(newFieldErrors).length > 0) {
          setFieldErrors(newFieldErrors);
        } else {
          setFormError("Registration failed. Please try again.");
        }
      } else {
        setFormError("An unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const FieldError = ({ field }) =>
    fieldErrors[field] ? (
      <p className="text-red-500 text-xs mt-1">{fieldErrors[field]}</p>
    ) : null;

  return (
    <>
      <Header />
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        <Card className="w-full max-w-lg p-10 rounded-2xl shadow-2xl bg-white border-0">
          {/* Back Button */}
          <Link
            href="/student/login"
            className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-4 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Login</span>
          </Link>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 mb-4 shadow-lg">
              <UserPlus className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Student Registration
            </h1>
            <p className="text-gray-600">
              Create your student account to join classes
            </p>
          </div>

          <CardContent className="space-y-4 px-0">
            {/* General Error */}
            {formError && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 flex items-start gap-3">
                <div className="bg-red-100 rounded-full p-1 mt-0.5">
                  <svg
                    className="h-4 w-4 text-red-600"
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
                <span className="text-sm font-medium">{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <User className="h-4 w-4" /> Full Name{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Enter your full name"
                  className="h-11"
                  disabled={isSubmitting}
                />
                <FieldError field="name" />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Mail className="h-4 w-4" /> Email{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="Enter your email"
                  className="h-11"
                  disabled={isSubmitting}
                />
                <FieldError field="email" />
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <User className="h-4 w-4" /> Username{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  placeholder="Choose a username"
                  className="h-11"
                  disabled={isSubmitting}
                />
                <FieldError field="username" />
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Date of Birth{" "}
                  <span className="text-gray-400 text-xs">(Optional)</span>
                </Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) =>
                    handleChange("date_of_birth", e.target.value)
                  }
                  className="h-11"
                  disabled={isSubmitting}
                />
                <FieldError field="date_of_birth" />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Lock className="h-4 w-4" /> Password{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="Min. 6 characters"
                  className="h-11"
                  disabled={isSubmitting}
                />
                <FieldError field="password" />
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                  <Lock className="h-4 w-4" /> Confirm Password{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) =>
                    handleChange("confirm_password", e.target.value)
                  }
                  placeholder="Confirm your password"
                  className="h-11"
                  disabled={isSubmitting}
                />
                <FieldError field="confirm_password" />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-12 mt-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            {/* Login Link */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  href="/student/login"
                  className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
