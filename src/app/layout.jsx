"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/UserContext";
import axios from "axios";
import LoadingScreen from "./loading";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Configuración de axios
axios.defaults.withCredentials = true;
axios.defaults.baseURL = 
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/";

// Componente que maneja la carga entre páginas
function LoadingWrapper({ children }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    // Función para mostrar/ocultar el loader
    const showLoader = () => setLoading(true);
    const hideLoader = () => setLoading(false);
    
    // Observador para detectar cuando termina la carga
    const observer = new MutationObserver(() => {
      if (document.body.classList.contains('page-loaded')) {
        hideLoader();
      }
    });
    
    observer.observe(document.body, { attributes: true, childList: true });
    
    // Marcar cuando la página ha cargado
    document.body.classList.add('page-loaded');
    
    // Capturar eventos de navegación
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.href && link.href.startsWith(window.location.origin)) {
        showLoader();
      }
    });
    
    // Capturar cambios de ruta
    const originalPush = router.push;
    const originalReplace = router.replace;
    
    router.push = function() {
      showLoader();
      return originalPush.apply(this, arguments);
    };
    
    router.replace = function() {
      showLoader();
      return originalReplace.apply(this, arguments);
    };
    
    window.addEventListener('load', hideLoader);
    window.addEventListener('beforeunload', showLoader);
    
    // Limpieza
    return () => {
      observer.disconnect();
      document.removeEventListener('click', showLoader);
      window.removeEventListener('load', hideLoader);
      window.removeEventListener('beforeunload', showLoader);
      router.push = originalPush;
      router.replace = originalReplace;
    };
  }, [router]);
  
  return (
    <>
      {loading && <LoadingScreen />}
      {children}
    </>
  );
}

export default function RootLayout({ children }) {
  return (
    <AuthProvider>
      <html lang="en">
        <body
          suppressHydrationWarning={true}
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <LoadingWrapper>{children}</LoadingWrapper>
        </body>
      </html>
    </AuthProvider>
  );
}