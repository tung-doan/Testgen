"use client";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { HeaderSkeleton } from "@/components/ui/skeletons";
import { logoutUser } from "../utils/auth.js";
import { useRouter } from "next/navigation";
import { Menu, X, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export default function Header() {
  const { user, setUser, loading, authError } = useAuth();
  const Router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems = [
    { label: "About", href: "/about" },
    { label: "How to use", href: "/how-to-use" },
    { label: "Log in", href: "/login" },
  ];

  const filetedNavItems = navItems.filter((item) => item.label !== "Log in");

  const handlerlogout = async () => {
    try {
      setIsLoggingOut(true);
      window.dispatchEvent(new Event("navigation-start"));
      await logoutUser();
      localStorage.removeItem("user");
      localStorage.removeItem("student");
      setUser(null);
      Router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  // Hiển thị HeaderSkeleton khi đang tải - không block toàn bộ trang
  if (loading && !authError) {
    return <HeaderSkeleton />;
  }

  return (
    <header className="w-full bg-[#dfdfdf] py-4 md:py-6 position-sticky top-0 z-50 shadow-md">
      <div className="container max-w-[1152px] mx-auto flex justify-between items-center px-4 md:px-0">
        {/* Logo and brand name */}
        <Link href="/">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center">
              <Image
                src={"/images/test.png"}
                alt="TestGen Logo"
                width={40}
                height={40}
                className="w-8 h-8 md:w-10 md:h-10 text-blue-400"
              />
            </div>
            <span className="[font-family:'JejuGothic-Regular',Helvetica] text-xl md:text-2xl">
              TestGen
            </span>
          </div>
        </Link>

        {/* Desktop Navigation for authenticated users */}
        {user ? (
          <>
            <nav className="hidden md:flex items-center gap-4">
              {filetedNavItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="p-2.5 [font-family:'Inter-Regular',Helvetica] text-2xl cursor-pointer hover:text-[#807F7F] transition-colors duration-300 ease-in-out"
                >
                  {item.label}
                </Link>
              ))}
              <Button
                className="bg-[#00d636] p-2 text-black hover:bg-[#212221] hover:text-[#00BE06] [font-family:'Inter-Regular',Helvetica] text-2xl h-[49px] rounded-lg cursor-pointer transition-colors duration-300 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
                onClick={handlerlogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Logging out...
                  </>
                ) : (
                  "Logout"
                )}
              </Button>

              {/* User Avatar - positioned far right */}
              <Link href="/profile" className="flex items-center shrink-0">
                <div className="w-10 h-10 rounded-full border-2 border-[#00d636] overflow-hidden hover:scale-105 transition-transform duration-300 cursor-pointer shadow bg-white flex items-center justify-center">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt="User Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">
                      {user.username
                        ? user.username.charAt(0).toUpperCase()
                        : "U"}
                    </div>
                  )}
                </div>
              </Link>
            </nav>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </>
        ) : (
          <>
            <nav className="hidden md:flex items-center gap-4">
              {navItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="p-2.5 [font-family:'Inter-Regular',Helvetica] text-2xl cursor-pointer hover:text-[#807F7F] transition-colors duration-300 ease-in-out"
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/register">
                <Button className="bg-[#00d636] text-black hover:bg-[#212221] hover:text-[#00BE06] [font-family:'Inter-Regular',Helvetica] text-2xl h-[49px] rounded-lg cursor-pointer transition-colors duration-300 ease-in-out">
                  Sign up
                </Button>
              </Link>
            </nav>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-black/10 transition-colors"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Mobile Menu Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" className="w-[280px] sm:w-[320px] bg-white">
          <SheetHeader className="text-left pb-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Image
                src={"/images/test.png"}
                alt="TestGen Logo"
                width={28}
                height={28}
              />
              TestGen
            </SheetTitle>
            <SheetDescription className="text-sm">
              Navigation Menu
            </SheetDescription>
          </SheetHeader>

          <nav className="flex flex-col gap-1 mt-6">
            {user ? (
              <>
                {/* User Info Header in Mobile Menu */}
                <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl mb-4">
                  <div className="w-12 h-12 rounded-full border-2 border-emerald-500 overflow-hidden bg-white flex items-center justify-center shrink-0">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt="User Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">
                        {user.username
                          ? user.username.charAt(0).toUpperCase()
                          : "U"}
                      </div>
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-semibold text-gray-800 truncate">
                      {user.username}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {user.email}
                    </div>
                  </div>
                </div>

                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-3 text-lg font-medium rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  My Profile
                </Link>

                {filetedNavItems.map((item, index) => (
                  <Link
                    key={index}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-3 text-lg font-medium rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="border-t my-3" />
                <Button
                  className="bg-[#00d636] text-black hover:bg-[#212221] hover:text-[#00BE06] text-lg h-12 rounded-lg cursor-pointer transition-colors duration-300 ease-in-out w-full disabled:opacity-70 disabled:cursor-not-allowed"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handlerlogout();
                  }}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Logging out...
                    </>
                  ) : (
                    "Logout"
                  )}
                </Button>
              </>
            ) : (
              <>
                {navItems.map((item, index) => (
                  <Link
                    key={index}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-3 text-lg font-medium rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="border-t my-3" />
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="bg-[#00d636] text-black hover:bg-[#212221] hover:text-[#00BE06] text-lg h-12 rounded-lg cursor-pointer transition-colors duration-300 ease-in-out w-full">
                    Sign up
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
