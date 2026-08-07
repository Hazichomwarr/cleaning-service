import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Just Cleaning LLC | Professional Home & Commercial Cleaning",

  description:
    "Professional home and commercial cleaning services you can request online. From routine cleaning and deep cleaning to move-in, move-out, office, and Airbnb cleaning.",

  keywords: [
    "Just Cleaning LLC",
    "professional cleaning services",
    "house cleaning",
    "home cleaning",
    "commercial cleaning",
    "office cleaning",
    "deep cleaning",
    "move in cleaning",
    "move out cleaning",
    "Airbnb cleaning",
    "local cleaning service",
  ],

  openGraph: {
    title: "Just Cleaning LLC | A Cleaner Space, Without the Stress",
    description:
      "Reliable professional cleaning for homes and businesses. Request your cleaning online and choose a time that works for you.",
    type: "website",
    siteName: "Just Cleaning LLC",
  },

  twitter: {
    card: "summary_large_image",
    title: "Just Cleaning LLC | Professional Cleaning Services",
    description:
      "Professional home and commercial cleaning, scheduled around your life.",
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
