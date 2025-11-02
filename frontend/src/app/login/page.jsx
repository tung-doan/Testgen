'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/Header";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth"; // Sử dụng custom hook thay vì functions riêng lẻ
import LoadingScreen from "../loading";
import { useForm } from "@/hooks/useForm"; // Custom hook form mới

export default function LoginPage() {
  const router = useRouter();
  const { login, loading: authLoading, error: authError } = useAuth();
  
  // Sử dụng custom hook useForm để quản lý form state và validation
  const form = useForm({
    initialValues: {
      username: "",
      password: "",
    },
    validate: (values) => {
      const errors = {};
      if (!values.username) errors.username = "Username is required";
      if (!values.password) errors.password = "Password is required";
      return errors;
    },
    onSubmit: async (values) => {
      try {
        await login(values.username, values.password);
        router.push("/class");
      } catch (error) {
        // Error đã được xử lý trong hook useAuth
        console.error("Login process failed:", error);
      }
    }
  });

  return (
    <>
      {(form.isSubmitting || authLoading) && <LoadingScreen message="Signing in..." />}
      <Header />
      <div className="flex justify-center items-center min-h-screen bg-[#f3f7f5] p-6">
        <Card className="w-full max-w-xl p-8 rounded-3xl shadow-xl bg-white border-none">
          <h1 className="text-4xl font-bold text-center mb-8">Log in</h1>
          <CardContent className="space-y-6">
            {/* Hiển thị lỗi authentication nếu có */}
            {authError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md border border-red-200">
                {authError}
              </div>
            )}
          
            <form onSubmit={form.handleSubmit} className="space-y-6">
              {/* Username */}
              <div className="space-y-2 m-3">
                <label htmlFor="username" className="block text-lg font-semibold">
                  Username
                </label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={form.values.username}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  className={form.touched.username && form.errors.username ? "border-red-500" : ""}
                />
                {form.touched.username && form.errors.username && (
                  <p className="text-red-500 text-sm">{form.errors.username}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2 m-3">
                <label htmlFor="password" className="block text-lg font-semibold">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={form.values.password}
                  onChange={form.handleChange}
                  onBlur={form.handleBlur}
                  className={form.touched.password && form.errors.password ? "border-red-500" : ""}
                />
                {form.touched.password && form.errors.password && (
                  <p className="text-red-500 text-sm">{form.errors.password}</p>
                )}
              </div>

              <Separator className="my-4" />

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full py-6 mt-4 bg-[#00d663] hover:bg-[#00c058] rounded-full text-xl font-semibold cursor-pointer"
                disabled={form.isSubmitting || authLoading || !form.isValid}
              >
                {form.isSubmitting || authLoading ? "Signing in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}