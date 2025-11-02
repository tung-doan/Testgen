'use client'

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList
} from "@/components/ui/navigation-menu";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Class", href: "/class" },
    { label: "Create Tests", href: "/quiz" },
    { label: "Students", href: "/student" },
    { label: "Statistics", href:"/statistics"},
  ];

  return (
    <header className="w-full flex items-start bg-[#302f2fd1] px-14 py-6 top-0 z-50 shadow-md">
      <NavigationMenu className="max-w-none">
        <NavigationMenuList className="flex justify-start gap-8">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href;

            return (
              <NavigationMenuItem key={index} className="flex justify-start gap-2">
                <Link href={item.href} passHref legacyBehavior>
                  <NavigationMenuLink
                    className={`p-2.5 text-2xl cursor-pointer hover:text-[#807F7F] transition-colors duration-300 ease-in-out ${
                      isActive ? "text-[#00d663]" : ""
                    }`}
                  >
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
