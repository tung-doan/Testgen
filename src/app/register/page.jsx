'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import React, { useState } from "react";
import axios from "axios";
import Router from "next/navigation";
import Header from "@/components/Header";
import LoadingScreen from "../loading";

export default function Frame() {
  const router = Router.useRouter();
  const apiurl = process.env.NEXT_PUBLIC_API_URL;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const submitHandler = (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      setIsSubmitting(false);
      return;
    }

    if (!username || !email || !password || !confirmPassword || !gender || !dob) {
      alert("Please fill in all fields!");
      setIsSubmitting(false);
      return;
    }

    axios.post(apiurl + "users/register/", {
      username,
      email,
      password,
      confirm_password: confirmPassword,
      gender,
      date_of_birth: dob,
    })
      .then((response) => {
        console.log("Registration successful:", response.data);
        router.push("/login");
      })
      .catch((error) => {
        if (error.response) {
          alert(`Error: ${error.response.data.message || "An error occurred"}`);
        } else {
          alert("An unexpected error occurred.");
        }
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <>
    {isSubmitting && <LoadingScreen />}
      <Header />
      <div className="flex justify-center items-center min-h-screen bg-[#f3f7f5] p-6">
        <Card className="w-full max-w-xl p-8 rounded-3xl shadow-xl bg-white border-none">
          <h1 className="text-4xl font-bold text-center mb-8">Register</h1>
          <CardContent className="space-y-6">
            {/* Username */}
            <div className="space-y-4 m-3">
              <Label htmlFor="username">Username</Label>
              <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>

            {/* Email */}
            <div className="space-y-2 m-3">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            {/* Gender */}
            <div className="space-y-2 m-3">
              <Label htmlFor="gender">Gender</Label>
              <Select onValueChange={(value) => setGender(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2 m-3">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>

            {/* Password */}
            <div className="space-y-2 m-3">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {/* Confirm Password */}
            <div className="space-y-2 m-3">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>

            <Separator className="my-4" />

            {/* Social logins */}
            {/* <div className="flex flex-col gap-4">
              <Button variant="outline" className="flex items-center justify-center gap-4 bg-[#6fd773] hover:bg-[#5fc763] cursor-pointer">
                <img src="/images/google.png" alt="Google" className="w-6 h-6" />
                Register with Google
              </Button>
              <Button variant="outline" className="flex items-center justify-center gap-4 bg-[#6fd773] hover:bg-[#5fc763] cursor-pointer">
                <img src="/images/fb.png" alt="Facebook" className="w-6 h-6" />
                Register with Facebook
              </Button>
            </div> */}

            {/* Submit */}
            <Button
              className="w-full py-6 mt-4 bg-[#00d663] hover:bg-[#00c058] rounded-full text-xl font-semibold cursor-pointer"
              onClick={submitHandler}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
