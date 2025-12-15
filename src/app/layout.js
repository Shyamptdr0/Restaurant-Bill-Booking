import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NetworkStatus } from "@/components/network-status";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Restaurant POS - Billing System",
  description: "Complete restaurant billing and management system",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ea580c",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#ea580c" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`₹{geistSans.variable} ₹{geistMono.variable} antialiased`}
      >
        {children}
        <NetworkStatus />
      </body>
    </html>
  );
}
