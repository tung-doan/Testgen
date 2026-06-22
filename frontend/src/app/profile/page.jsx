"use client";
import React, { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Camera, User, Mail, Calendar, Sparkles, Loader2, ArrowLeft } from "lucide-react";
import Notification from "@/components/common/Notification";

export default function ProfilePage() {
  const router = useRouter();
  const { user, updateProfile, loading, isAuthenticated } = useAuth();
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Notification state
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "success",
  });
  
  const fileInputRef = useRef(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  // Load user data into form
  useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setEmail(user.email || "");
      setFirstName(user.full_name || "");
      setGender(user.gender || "");
      setDob(user.date_of_birth || "");
      setAvatarPreview(user.avatar || "");
    }
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB limit
      if (file.size > MAX_FILE_SIZE) {
        setErrorMsg("Avatar file size exceeds 2MB limit. Please choose a smaller image.");
        setNotification({
          show: true,
          message: "File too large (Max 2MB).",
          type: "error",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }
      
      setAvatarFile(file);
      const localUrl = URL.createObjectURL(file);
      setAvatarPreview(localUrl);
      setErrorMsg(""); // Clear any previous errors
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg("");
    
    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("email", email);
      formData.append("full_name", firstName);
      formData.append("gender", gender);
      if (dob) {
        formData.append("date_of_birth", dob);
      }
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }
      
      await updateProfile(formData);
      
      setNotification({
        show: true,
        message: "Profile updated successfully!",
        type: "success",
      });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong while updating profile.");
      setNotification({
        show: true,
        message: err.message || "Failed to update profile.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseNotification = () => {
    setNotification((prev) => ({ ...prev, show: false }));
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
          <Loader2 className="h-12 w-12 text-emerald-500 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={handleCloseNotification}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Back button */}
          <button
            onClick={() => {
              if (user) {
                if (user.is_student) {
                  router.push("/student/dashboard");
                } else {
                  router.push("/class");
                }
              } else {
                router.back();
              }
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors mb-6 font-semibold group cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back
          </button>
          
          <Card className="w-full rounded-2xl shadow-2xl bg-white border-0 overflow-hidden !p-0">
            {/* Header banner */}
            <div className="h-32 bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center px-10 relative">
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-white animate-pulse" />
                <h1 className="text-3xl font-extrabold text-white">Account Settings</h1>
              </div>
            </div>
            
            <CardContent className="p-10 relative">
              {/* Profile Image & Avatar Upload Section */}
              <div className="flex flex-col sm:flex-row items-center gap-6 -mt-20 mb-8 border-b pb-8 border-gray-100">
                <div 
                  onClick={triggerFileInput}
                  className="relative w-32 h-32 rounded-full border-4 border-white overflow-hidden shadow-xl bg-gray-100 group cursor-pointer"
                >
                  {avatarPreview ? (
                    <img 
                      src={avatarPreview} 
                      alt="Avatar Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-4xl">
                      {username ? username.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  {/* Camera overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
                
                <div className="text-center sm:text-left mt-4 sm:mt-12">
                  <h2 className="text-2xl font-bold text-gray-800">{username || "User Profile"}</h2>
                  <p className="text-gray-500 mb-2">{email || "No email provided"}</p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={triggerFileInput}
                    className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-lg hover:cursor-pointer"
                  >
                    Change Picture
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>

              {/* Error Alert */}
              {errorMsg && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-3 mb-6">
                  <div className="bg-red-100 rounded-full p-1">
                    <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">{errorMsg}</span>
                </div>
              )}

              {/* Main Fields Form */}
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name Field */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Enter your full name"
                        className="pl-10 h-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Username Field */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="pl-10 h-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10 h-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Gender Field */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full h-12 px-3 border border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg bg-white"
                    >
                      <option value="">Select Gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                      <option value="O">Other</option>
                    </select>
                  </div>

                  {/* Date of Birth Field */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Date of Birth</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="pl-10 h-12 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    className="px-8 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg text-base font-semibold shadow-lg hover:shadow-xl hover:cursor-pointer transition-all duration-300 disabled:opacity-75"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Saving changes...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
