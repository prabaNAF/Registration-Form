import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Soil Day 2026 | NAF Student Competitions",
  description: "Dedicated SRM, VIT and Adhiparashakthi Agricultural College registration for World Soil Day 2026 student competitions by National Agro Foundation. Registration closes 16 November 2026 at 5:00 PM IST.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
