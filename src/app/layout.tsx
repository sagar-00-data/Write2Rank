import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Write2Rank | Professional Exam Evaluator",
  description: "AI-powered evaluation for ICAI, ICSI, and ICMAI students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable}`}>
        <div className="app-container">
          <Sidebar />
          <main className="main-content">
            <Topbar />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
