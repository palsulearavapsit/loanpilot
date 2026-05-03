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
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground gradient-surface`}
      >
        <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md" style={{ borderBottom: '2px solid #D39B2A', boxShadow: '0 2px 12px rgba(212,175,55,0.08)' }}>
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm overflow-hidden border border-gold/20 bg-white">
                <img src="/logo.png" alt="LoanPilot Logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-xl tracking-tight text-brand-black">LoanPilot</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/admin" className="text-sm font-semibold text-brand-black/60 hover:text-gold-dark transition-colors">Admin</Link>
              <Link
                href="/auth"
                className="px-6 py-2.5 rounded-full gradient-gold text-sm font-bold shadow-gold hover:shadow-gold-lg transition-all text-brand-black gold-glow"
              >
                Sign In
              </Link>
            </div>
          </div>
        </nav>
        <main className="pt-16 min-h-screen flex flex-col">
          {children}
        </main>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `}} />
      </body>
    </html>
  );
}
