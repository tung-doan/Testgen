'use client';
import { Button } from "@/components/ui/button";
import Image from "next/image";
import React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import LoadingScreen from "@/app/loading";
import { logoutUser } from "../utils/auth.js";
import { useRouter } from "next/navigation";

export default function Header() {
  const { user, setUser, loading, authError } = useAuth();
  const Router = useRouter()
  
  const navItems = [
    { label: "About", href: "/about" },
    { label: "How to use", href: "/how-to-use" },
    { label: "Log in", href: "/login" },
  ];

  const filetedNavItems = navItems.filter((item) => item.label !== "Log in");

  const handlerlogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      Router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  // Chỉ hiển thị LoadingScreen khi đang tải dữ liệu, không hiện khi có lỗi
  if (loading && !authError) {
    return <LoadingScreen message="Loading user data..." />;
  }

  return (
    <header className="w-full bg-[#dfdfdf] py-6 position-sticky top-0 z-50 shadow-md">
      <div className="container max-w-[1152px] mx-auto flex justify-between items-center cursor-pointer">
        {/* Logo and brand name */}
        <Link href="/">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 flex items-center justify-center">
              <Image 
                src={"/images/test.png"}
                alt="TestGen Logo"
                width={40}
                height={40}
                className="w-10 h-10 text-blue-400"
              />
            </div>
            <span className="[font-family:'JejuGothic-Regular',Helvetica] text-2xl">
              TestGen
            </span>
          </div>
        </Link>
        
        {/* Navigation for authenticated and unauthenticated users */}
        {user ? (
          <nav className="flex items-center gap-4">
            {filetedNavItems.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className="p-2.5 [font-family:'Inter-Regular',Helvetica] text-2xl cursor-pointer hover:text-[#807F7F] transition-colors duration-300 ease-in-out"
              >
                {item.label}
              </a>
            ))}
            <Button 
              className="bg-[#00d636] p-2 text-black hover:bg-[#212221] hover:text-[#00BE06] [font-family:'Inter-Regular',Helvetica] text-2xl h-[49px] rounded-lg cursor-pointer transition-colors duration-300 ease-in-out" 
              onClick={handlerlogout}
            >
              Logout
            </Button>
          </nav>
        ) : (
          <nav className="flex items-center gap-4">
            {navItems.map((item, index) => (
              <a
                key={index}
                href={item.href}
                className="p-2.5 [font-family:'Inter-Regular',Helvetica] text-2xl cursor-pointer hover:text-[#807F7F] transition-colors duration-300 ease-in-out"
              >
                {item.label}
              </a>
            ))}
            <Link href='/register'>
              <Button className="bg-[#00d636] text-black hover:bg-[#212221] hover:text-[#00BE06] [font-family:'Inter-Regular',Helvetica] text-2xl h-[49px] rounded-lg cursor-pointer transition-colors duration-300 ease-in-out">
                Sign up
              </Button>
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}