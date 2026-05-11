import { Inter } from "next/font/google";
import "./globals.css";

import AppContent from "@/components/AppContent";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        
          <AppContent>{children}</AppContent>
        
      </body>
    </html>
  );
}
