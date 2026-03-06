import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import BottomNav from "@/components/layout/bottom-nav";
import ServiceWorkerRegister from "@/components/layout/sw-register";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
  weight: ["400", "500", "600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FitSync",
  description: "Your AI-powered fitness companion",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FitSync",
    startupImage: "/icons/icon-512.png",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
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
  themeColor: "#06060C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${outfit.variable} ${jakarta.variable} min-h-screen bg-[#06060C] font-sans text-[#EAEAF0] antialiased`}
      >
        {/* Animated aurora gradient mesh */}
        <div className="aurora-bg" aria-hidden="true">
          <div className="aurora-orb aurora-orb--emerald" />
          <div className="aurora-orb aurora-orb--rose" />
        </div>

        {/* Noise grain texture */}
        <div className="noise-overlay" aria-hidden="true" />

        {/* Content */}
        <main className="relative z-10 pb-[calc(70px+env(safe-area-inset-bottom,0px))]">
          {children}
        </main>
        <BottomNav />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
