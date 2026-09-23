import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "ServiTrack | Soporte Técnico",
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
        {children}
        <Toaster theme="light" position="top-right" richColors />
      </body>
    </html>
  );
}
