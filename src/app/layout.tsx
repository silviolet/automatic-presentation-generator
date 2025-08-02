import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Presentation Generator",
  description: "Automatically create scripts and video presentations!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-blue-50 text-gray-900 font-sans`}
      >
        {/* Navbar */}
        <header className="bg-white shadow-md sticky top-0 z-50">
          <nav className="max-w-6xl mx-auto flex justify-between items-center py-4 px-6">
            <Link href="/" className="text-xl font-bold text-blue-600">
              SlideNarrator AI
            </Link>
            <div className="space-x-4">
              <Link
                href="/"
                className="text-gray-700 hover:text-blue-600 font-medium transition"
              >
                Home
              </Link>
              <Link
                href="/generate"
                className="text-gray-700 hover:text-blue-600 font-medium transition"
              >
                Generate
              </Link>
            </div>
          </nav>
        </header>

        {/* Main content */}
        <main className="min-h-screen bg-blue-50 text-gray-900 font-sans">{children}</main>
      </body>
    </html>
  );
}