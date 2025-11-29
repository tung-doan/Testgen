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
import Link from "next/link";
import React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ChevronDown, FileText, Monitor } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();

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
      href: "/quiz",
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
      label: "Question Bank",
      href: "/question-bank",
    },
    { label: "Students", href: "/student" },
    { label: "Statistics", href: "/statistics" },
  ];

  const navItems = user && user.is_student ? studentNavItems : teacherNavItems;

  return (
    <header className="w-full flex items-start bg-[#302f2fd1] px-14 py-6 top-0 z-50 shadow-md">
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
                          asChild
                          className="focus:bg-[#3a3938] cursor-pointer"
                        >
                          <Link
                            href={subItem.href}
                            className="flex items-start gap-3 p-3 text-white hover:text-[#00d663] transition-colors duration-200"
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
                          </Link>
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
    </header>
  );
}
