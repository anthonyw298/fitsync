import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import BottomNav from "@/components/layout/bottom-nav";
import ServiceWorkerRegister from "@/components/layout/sw-register";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FitSync",
  description: "Your AI-powered fitness companion",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FitSync",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  userScalable: false,
  themeColor: "#0A0A0F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} min-h-screen bg-[#0A0A0F] font-sans text-[#F1F1F3] antialiased`}
      >
        <main className="pb-[calc(70px+env(safe-area-inset-bottom,0px))]">
          {children}
        </main>
        <BottomNav />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
