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
  title: "LoanPilot | Agentic AI Loan Onboarding",
  description: "Secure, AI-powered loan onboarding with live video verification.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground gradient-surface`}
      >
        <nav className="fixed top-0 w-full z-50 bg-glass border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center font-bold text-white">
                L
              </div>
              <span className="font-bold text-xl tracking-tight">LoanPilot</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/admin" className="text-sm font-medium hover:text-primary transition-colors">Admin</Link>
              <Link 
                href="/auth" 
                className="px-6 py-2 rounded-full gradient-primary text-sm font-semibold hover:shadow-lg hover:shadow-primary/20 transition-all text-white"
              >
                Sign In
              </Link>
            </div>
          </div>
        </nav>
        <main className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
