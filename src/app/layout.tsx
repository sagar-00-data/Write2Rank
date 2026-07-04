import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import AppContent from "@/components/AppContent";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xaminix | AI-Powered Answer Evaluation Platform",
  description: "AI-powered descriptive answer evaluation for CS, CA, CMA and other professional examinations.",
  openGraph: {
    title: "Xaminix | AI-Powered Answer Evaluation Platform",
    description: "AI-powered descriptive answer evaluation for CS, CA, CMA and other professional examinations.",
    siteName: "Xaminix",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Xaminix | AI-Powered Answer Evaluation Platform",
    description: "AI-powered descriptive answer evaluation for CS, CA, CMA and other professional examinations.",
  },
};

const customLocalization = {
  signIn: {
    start: {
      title: "Welcome to Xaminix",
      subtitle: "AI-Powered Answer Evaluation Platform for Professional Exams",
    },
  },
  signUp: {
    start: {
      title: "Create your Xaminix account",
      subtitle: "AI-Powered Answer Evaluation Platform for Professional Exams",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider localization={customLocalization}>
      <html lang="en">
        <body>
          <AuthProvider>
            <AppContent>{children}</AppContent>
          </AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}


