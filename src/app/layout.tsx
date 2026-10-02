import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ServiTrack | Soporte Técnico - MUR Tecnología",
  description: "Plataforma corporativa de gestión de soporte técnico e incidencias de hardware.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#F8FAFC] text-slate-900 antialiased`}>
        <AuthProvider>
          {children}
          <Toaster theme="light" position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
