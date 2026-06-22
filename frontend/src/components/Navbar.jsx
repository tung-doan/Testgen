"use client";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import Link from "next/link";
import React,  { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ChevronDown, FileText, Monitor, Menu } from "lucide-react";


export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isStudent, setIsStudent] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        const user = JSON.parse(raw);
        setIsStudent(user?.is_student ?? false);
      } catch (e) {
        console.error("Invalid user data in localStorage");
        setIsStudent(false);
      }
    } else {
      setIsStudent(false);
    }
  }, []);

  const studentNavItems = [
    { label: "Dashboard", href: "/student/dashboard" },
    { label: "History", href: "/student/history" },
    { label: "Classes", href: "/student/classes" },
    { label: "Pending Tests", href: "/student/pending" },
  ];

  const teacherNavItems = [
    { label: "Class", href: "/class" },
    {
      label: "Create Tests",
      href: "/create-test",
      isDropdown: true,
      dropdownItems: [
        {
          label: "Online Test",
          href: "/create-test/online",
          icon: Monitor,
          description: "Create interactive online exam",
        },
        {
          label: "Paper Test",
          href: "/create-test/paper",
          icon: FileText,
          description: "Generate printable exam sheets",
        },
      ],
    },
    {
      label: "Manage Tests",
      href: "/manage-tests",
      isDropdown: true,
      dropdownItems: [
        {
          label: "Online Tests",
          href: "/online-tests",
          icon: Monitor,
          description: "Manage online exams",
        },
        {
          label: "Paper Tests",
          href: "/quiz",
          icon: FileText,
          description: "Manage printable exams",
        },
      ],
    },
    {
      label: "Question Bank",
      href: "/question-bank",
    },
    { label: "Statistics", href: "/statistics" },
  ];

  const navItems =  isStudent ? studentNavItems : teacherNavItems;

  return (
    <header className="w-full flex items-center bg-[#302f2fd1] px-4 md:px-14 py-4 md:py-6 top-0 z-50 shadow-md">
      {/* Desktop Navigation */}
      <div className="hidden md:block flex-1">
        <NavigationMenu className="max-w-none">
          <NavigationMenuList className="flex justify-start gap-8">
            {navItems.map((item, index) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/") ||
                (item.dropdownItems &&
                  item.dropdownItems.some((sub) => pathname === sub.href));

              // Nếu là dropdown item
              if (item.isDropdown) {
                return (
                  <NavigationMenuItem
                    key={index}
                    className="flex justify-start gap-2"
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={`p-2.5 text-2xl cursor-pointer hover:text-[#807F7F] transition-colors duration-300 ease-in-out flex items-center gap-1 bg-transparent border-none outline-none ${
                            isActive ? "text-[#00d663]" : "text-white"
                          }`}
                        >
                          {item.label}
                          <ChevronDown className="h-5 w-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-72 bg-[#2a2928] border-[#404040] mt-2"
                      >
                        {item.dropdownItems.map((subItem, subIndex) => (
                          <DropdownMenuItem
                            key={subIndex}
                            className="focus:bg-[#3a3938] cursor-pointer flex items-start gap-3 p-3 text-white hover:text-[#00d663] transition-colors duration-200"
                            onSelect={(e) => {
                              e.preventDefault();
                              if (pathname !== subItem.href) {
                                window.dispatchEvent(new Event("navigation-start"));
                                router.push(subItem.href);
                              }
                            }}
                          >
                            <div className="bg-[#3a3938] p-2 rounded-lg mt-0.5">
                              <subItem.icon className="h-5 w-5 text-[#00d663]" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-base">
                                {subItem.label}
                              </span>
                              <span className="text-sm text-gray-400 mt-0.5">
                                {subItem.description}
                              </span>
                            </div>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </NavigationMenuItem>
                );
              }

              // Nếu là nav item thông thường
              return (
                <NavigationMenuItem
                  key={index}
                  className="flex justify-start gap-2"
                >
                  <Link href={item.href} passHref legacyBehavior>
                    <NavigationMenuLink
                      className={`p-2.5 text-2xl cursor-pointer hover:text-[#807F7F] transition-colors duration-300 ease-in-out flex items-center gap-2 ${
                        isActive ? "text-[#00d663]" : "text-white"
                      }`}
                    >
                      {item.icon && <item.icon className="h-5 w-5" />}
                      {item.label}
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      {/* Mobile Hamburger Button */}
      <div className="md:hidden flex-1">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="text-white p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Navigation Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[280px] sm:w-[320px] bg-[#1a1a1a] border-[#333] text-white">
          <SheetHeader className="text-left pb-4 border-b border-[#333]">
            <SheetTitle className="text-white text-lg">Navigation</SheetTitle>
            <SheetDescription className="text-gray-400 text-sm">
              {isStudent ? "Student Portal" : "Teacher Dashboard"}
            </SheetDescription>
          </SheetHeader>
          
          <nav className="flex flex-col gap-1 mt-6">
            {navItems.map((item, index) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(item.href + "/") ||
                (item.dropdownItems &&
                  item.dropdownItems.some((sub) => pathname === sub.href));

              // Dropdown items expand inline on mobile
              if (item.isDropdown) {
                return (
                  <div key={index} className="flex flex-col">
                    <div
                      className={`p-3 text-base font-semibold rounded-lg ${
                        isActive ? "text-[#00d663]" : "text-gray-300"
                      }`}
                    >
                      {item.label}
                    </div>
                    <div className="ml-3 flex flex-col gap-1 border-l-2 border-[#333] pl-3">
                      {item.dropdownItems.map((subItem, subIndex) => {
                        const subActive = pathname === subItem.href;
                        return (
                          <Link
                            key={subIndex}
                            href={subItem.href}
                            onClick={() => {
                              setMobileMenuOpen(false);
                              if (pathname !== subItem.href) {
                                window.dispatchEvent(new Event("navigation-start"));
                              }
                            }}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-colors duration-200 ${
                              subActive
                                ? "bg-[#00d663]/10 text-[#00d663]"
                                : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                          >
                            <div className={`p-1.5 rounded-md ${subActive ? "bg-[#00d663]/20" : "bg-[#2a2928]"}`}>
                              <subItem.icon className={`h-4 w-4 ${subActive ? "text-[#00d663]" : "text-gray-400"}`} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{subItem.label}</span>
                              <span className="text-xs text-gray-500">{subItem.description}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Regular nav items
              return (
                <Link
                  key={index}
                  href={item.href}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (pathname !== item.href) {
                      window.dispatchEvent(new Event("navigation-start"));
                    }
                  }}
                  className={`p-3 text-base font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? "text-[#00d663] bg-[#00d663]/10"
                      : "text-gray-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
