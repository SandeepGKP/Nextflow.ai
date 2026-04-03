import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Monitor } from "lucide-react";
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
  title: "NextFlow.ai",
  description: "Pixel-perfect Krea.ai clone for LLM workflows",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      >
        <body className="h-full flex flex-col bg-zinc-950 text-zinc-50 overflow-hidden">
          {/* Mobile/Tablet Warning Overlay */}
          <div className="lg:hidden fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-zinc-950 p-6 text-center">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mb-6 border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
              <Monitor className="w-10 h-10 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Please Switch to Bigger Screen</h1>
            <p className="text-zinc-400 text-sm max-w-[300px] leading-relaxed">
              The NextFlow visual orchestrator is optimized for larger screens (laptop or desktop or tablet) to continue building your workflows.
            </p>
          </div>

          {/* Main App Content (Hidden until LG) */}
          <div className="hidden lg:contents">
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
