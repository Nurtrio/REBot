import type { Metadata, Viewport } from "next";
import { DM_Sans, Newsreader } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { SoftUpsellHost } from "@/components/providers";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Framewalk — Real Estate Media OS",
  description:
    "Guided shoot. Natural grade. Instant marketing. One place.",
  applicationName: "Framewalk",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Framewalk",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F7F4EF",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${newsreader.variable}`}>
      <body className="bg-paper font-sans text-ink antialiased">
        <div className="fw-shell bg-paper pb-20">
          {children}
          <SoftUpsellHost />
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
