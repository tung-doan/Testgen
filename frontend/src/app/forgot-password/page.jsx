"use client";
import React, { useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Mail, KeyRound, Lock, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import { sendPasswordResetEmail, confirmPasswordReset } from "@/utils/auth";
import Notification from "@/components/common/Notification";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Enter email, 2: Enter OTP and new password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const handleCloseNotification = () => {
    setNotification((prev) => ({ ...prev, show: false }));
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await sendPasswordResetEmail(email);
      setSuccessMsg("OTP code has been sent to your email!");
      setNotification({
        show: true,
        message: "OTP code sent successfully!",
        type: "success",
      });
      setStep(2); // Go to step 2
    } catch (err) {
      setErrorMsg(err.message || "Failed to send OTP code. Please check your email.");
      setNotification({
        show: true,
        message: err.message || "Failed to request OTP.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      await confirmPasswordReset(email, otp, newPassword);
      setSuccessMsg("Password reset successfully! Redirecting to login...");
      setNotification({
        show: true,
        message: "Password reset successfully!",
        type: "success",
      });
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setErrorMsg(err.message || "Invalid OTP code or password reset failed.");
      setNotification({
        show: true,
        message: err.message || "Password reset failed.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={handleCloseNotification}
      />

      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6">
        <Card className="w-full max-w-lg p-10 rounded-2xl shadow-2xl bg-white border-0 hover:shadow-3xl transition-all duration-300">
          {/* Back to Login link */}
          <button
            onClick={() => router.push("/login")}
            className="flex items-center gap-1.5 text-gray-500 hover:text-emerald-600 transition-colors mb-6 font-semibold cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Login
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 mb-4 shadow-lg">
              <KeyRound className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              {step === 1 ? "Forgot Password" : "Reset Password"}
            </h1>
            <p className="text-gray-600">
              {step === 1 
                ? "Enter your email address to receive a secure 6-digit OTP code."
                : "Enter the 6-digit OTP sent to your email and your new password."}
            </p>
          </div>

          <CardContent className="space-y-6">
            {/* Error Message */}
            {errorMsg && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-start gap-3">
                <div className="bg-red-100 rounded-full p-1 shrink-0">
                  <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm font-medium">{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200 flex items-start gap-3">
                <div className="bg-emerald-100 rounded-full p-1 shrink-0">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="text-sm font-medium">{successMsg}</span>
              </div>
            )}

            {/* Step 1 Form */}
            {step === 1 ? (
              <form onSubmit={handleRequestOTP} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 h-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                      placeholder="Enter your registered email"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 mt-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg text-base font-semibold shadow-lg hover:shadow-xl hover:cursor-pointer transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    "Send OTP Code"
                  )}
                </Button>
              </form>
            ) : (
              /* Step 2 Form */
              <form onSubmit={handleResetPassword} className="space-y-5">
                {/* OTP Field */}
                <div className="space-y-2">
                  <label htmlFor="otp" className="block text-sm font-semibold text-gray-700">
                    6-Digit OTP Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="otp"
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                      autoComplete="one-time-code"
                      required
                      disabled={loading}
                      className="pl-10 h-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg tracking-widest font-bold text-center text-lg"
                      placeholder="Enter 6-digit code"
                    />
                  </div>
                </div>

                {/* New Password Field */}
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 h-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                      placeholder="Enter new password"
                    />
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 h-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 mt-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg text-base font-semibold shadow-lg hover:shadow-xl hover:cursor-pointer transition-all duration-300"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Resetting password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
                
                {/* Request New OTP option */}
                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setOtp("");
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold hover:underline cursor-pointer"
                  >
                    Resend Code / Change Email
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
