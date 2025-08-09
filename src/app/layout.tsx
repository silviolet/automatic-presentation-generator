import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import SignOutButton from "./SignOutButton";

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
              <SignOutButton />
            </div>
          </nav>
        </header>

        {/* Main content */}
        <main className="min-h-screen bg-blue-50 text-gray-900 font-sans">{children}</main>
        {/* Footer */}
        <footer className="bg-blue-50 border-t border-blue-100">
          <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-600">
            <div className="text-center md:text-left">
              <p>© {new Date().getFullYear()} SlideNarrator AI. All rights reserved.</p>
            </div>
            <div className="flex gap-4">
              <a href="/privacy" className="hover:text-blue-600 transition">Privacy</a>
              <a href="/terms" className="hover:text-blue-600 transition">Terms</a>
              <a href="mailto:support@slidenarrator.ai" className="hover:text-blue-600 transition">Contact</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}