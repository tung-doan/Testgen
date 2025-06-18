'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import Header from "@/components/Header";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser, refreshToken } from "../../../utils/auth";
import { useAuth } from "@/UserContext";
import LoadingScreen from "../loading";

export default function Frame() {
  const { refreshUser } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitHandler = async (e) => {
  e.preventDefault();
  if (isSubmitting) return;
  setIsSubmitting(true);

  if (!username || !password) {
    alert("Please fill in all fields!");
    setIsSubmitting(false);
    return;
  }

  try {
    const response = await loginUser(username, password);
    if (response.status === 401) {
      await refreshToken();
      await loginUser(username, password);
    }
    await refreshUser();
    
    // ĐỪNG set isSubmitting = false ở đây hay trong finally
    // Để nó tiếp tục hiển thị loading cho đến khi trang mới được load
    router.push("/class");
  } catch (error) {
    console.error("Login failed:", error);
    alert("Login failed! Please check your credentials.");
    // Chỉ set false khi có lỗi
    setIsSubmitting(false);
  }
};

  return (
    <>
    {isSubmitting && <LoadingScreen />}
      <Header />
      <div className="flex justify-center items-center min-h-screen bg-[#f3f7f5] p-6">
        <Card className="w-full max-w-xl p-8 rounded-3xl shadow-xl bg-white border-none">
          <h1 className="text-4xl font-bold text-center mb-8">Log in</h1>
          <CardContent className="space-y-6">
            {/* Username */}
            <div className="space-y-4 m-3">
              <label htmlFor="username" className="block text-lg font-semibold">Username</label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            {/* Password */}
            <div className="space-y-4 m-3">
              <label htmlFor="password" className="block text-lg font-semibold">Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Separator className="my-4" />

            {/* Social logins */}
            {/* <div className="flex flex-col gap-4">
              <Button variant="outline" className="flex items-center justify-center gap-4 bg-[#6fd773] hover:bg-[#5fc763] cursor-pointer">
                <img src="/images/google.png" alt="Google" className="w-6 h-6" />
                Log in with Google
              </Button>
              <Button variant="outline" className="flex items-center justify-center gap-4 bg-[#6fd773] hover:bg-[#5fc763] cursor-pointer">
                <img src="/images/fb.png" alt="Facebook" className="w-6 h-6" />
                Log in with Facebook
              </Button>
            </div> */}

            {/* Submit button */}
            <Button
              className="w-full py-6 mt-4 bg-[#00d663] hover:bg-[#00c058] rounded-full text-xl font-semibold cursor-pointer"
              onClick={submitHandler}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Login"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
