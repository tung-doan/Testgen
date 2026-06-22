"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React, { useState } from "react";
import { User, Mail, Calendar, Lock } from "lucide-react";
import apiClient from "@/services/api-client";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Notification from "@/components/common/Notification";

export default function Frame() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "info",
  });

  const submitHandler = (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (password !== confirmPassword) {
      setNotification({
        show: true,
        message: "Passwords do not match",
        type: "error",
      });
      return;
    }

    if (
      !username ||
      !firstName ||
      !email ||
      !password ||
      !confirmPassword ||
      !gender ||
      !dob
    ) {
      setNotification({
        show: true,
        message: "Please fill in all fields",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);
    // Trigger progress bar
    window.dispatchEvent(new Event("navigation-start"));

    apiClient
      .post("users/register/", {
        username,
        full_name: firstName,
        email,
        password,
        confirm_password: confirmPassword,
        gender,
        date_of_birth: dob,
      })
      .then((response) => {
        window.dispatchEvent(new Event("navigation-end"));
        setIsSubmitting(false);
        setNotification({
          show: true,
          message: "Registration successful",
          type: "success",
        });
        setTimeout(() => router.push("/login"), 900);
      })
      .catch((error) => {
        // End progress indicator
        window.dispatchEvent(new Event("navigation-end"));
        setIsSubmitting(false);

        let msg = "An unexpected error occurred.";
        if (error.response && error.response.data) {
          const data = error.response.data;
          if (typeof data === "string") msg = data;
          else if (data.message) msg = data.message;
          else if (typeof data === "object") {
            // Flatten validation errors
            const parts = [];
            Object.keys(data).forEach((k) => {
              const v = data[k];
              if (Array.isArray(v)) {
                v.forEach((item) => parts.push(`${k}: ${item}`));
              } else {
                parts.push(`${k}: ${String(v)}`);
              }
            });
            if (parts.length > 1) {
              msg = (
                <div className="flex flex-col gap-1">
                  {parts.map((p, i) => (
                    <span key={i}>• {p}</span>
                  ))}
                </div>
              );
            } else if (parts.length === 1) {
              msg = parts[0];
            }
          }
        }

        setNotification({ show: true, message: msg, type: "error" });
      });
  };

  return (
    <>
      <Header />
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6">
        <Card className="w-full max-w-lg p-10 rounded-2xl shadow-2xl bg-white border-0 hover:shadow-3xl transition-all duration-300">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mb-4 shadow-lg">
              <User className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              Create Account
            </h1>
            <p className="text-gray-600">Sign up to continue to TestGen</p>
          </div>

          <CardContent className="space-y-6">
            <form onSubmit={submitHandler}>
              {/* Full Name */}
              <div className="space-y-2">
                <label
                  htmlFor="firstName"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isSubmitting}
                    className="pl-10 h-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              {/* Username */}
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
                    disabled={isSubmitting}
                    className="pl-10 h-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    className="pl-10 h-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <label
                  htmlFor="gender"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Gender
                </label>
                <Select
                  onValueChange={(value) => setGender(value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Male</SelectItem>
                    <SelectItem value="F">Female</SelectItem>
                    <SelectItem value="O">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <label
                  htmlFor="dob"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="dob"
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    disabled={isSubmitting}
                    className="pl-10 h-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                  />
                </div>
              </div>

              {/* Password */}
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
                    disabled={isSubmitting}
                    className="pl-10 h-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                    placeholder="Create a password"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  className="h-12 border-gray-300 rounded-lg"
                  placeholder="Confirm your password"
                />
              </div>

              <Separator className="my-4" />

              {/* Submit */}
              <div className="m-3">
                <Button
                  type="submit"
                  className="w-full h-12 mt-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing up..." : "Create account"}
                </Button>
              </div>
            </form>

            <Notification
              show={notification.show}
              message={notification.message}
              type={notification.type}
              onClose={() =>
                setNotification({ show: false, message: "", type: "info" })
              }
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
