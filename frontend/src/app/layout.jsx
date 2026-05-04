"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import NavigationProgress from "@/components/NavigationProgress";
import { LoadingProvider } from "@/contexts/LoadingContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <AuthProvider>
      <LoadingProvider>
        <html lang="en">
          <body
            suppressHydrationWarning={true}
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          >
            <NavigationProgress />
            {children}
          </body>
        </html>
      </LoadingProvider>
    </AuthProvider>
  );
}