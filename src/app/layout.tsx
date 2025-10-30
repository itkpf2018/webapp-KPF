import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";
import { getBranding } from "@/lib/configStore";
import { getBrandingLogoSrc } from "@/lib/branding";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Attendance Tracker",
    template: "%s | Attendance Tracker",
  },
  description: "PWA สำหรับบันทึกเวลาเข้า-ออกงาน พร้อมถ่ายรูปและบันทึกพิกัดลง Supabase",
  manifest: "/manifest.json",
  applicationName: "Attendance Tracker",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/maskable-icon.png", sizes: "512x512", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Attendance Tracker",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2b6cff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getBranding();
  const brandingLogo = getBrandingLogoSrc(branding.logoPath, branding.updatedAt, null) ?? "";
  return (
    <html lang="th" className="h-full bg-slate-50">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-slate-50 text-slate-900`}
        data-branding-logo={brandingLogo}
        data-branding-updated-at={branding.updatedAt}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
