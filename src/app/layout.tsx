import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import AppContent from "@/components/AppContent";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL('https://xaminix.com'),
  title: {
    default: 'Xaminix — AI Answer Evaluation for CA, CS & CMA Students',
    template: '%s | Xaminix',
  },
  description:
    'Xaminix is an AI-powered answer evaluation platform for CA, CS, CMA and professional exam students. Upload handwritten answers, get instant AI grading, detailed feedback, and improve your scores.',
  keywords: [
    'AI answer evaluation',
    'CA exam preparation',
    'CS exam evaluation',
    'CMA exam practice',
    'handwritten answer checker',
    'AI grading',
    'descriptive answer evaluation',
    'professional exam preparation',
    'ICSI exam',
    'Xaminix',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Xaminix — AI Answer Evaluation for CA, CS & CMA Students',
    description:
      'Upload your handwritten answers and get instant AI-powered evaluation with detailed feedback. Built for CA, CS, CMA and professional exam students.',
    siteName: 'Xaminix',
    url: 'https://xaminix.com',
    type: 'website',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Xaminix — AI Answer Evaluation for CA, CS & CMA Students',
    description:
      'Upload your handwritten answers and get instant AI-powered evaluation with detailed feedback. Built for CA, CS, CMA and professional exam students.',
  },
  alternates: {
    canonical: 'https://xaminix.com',
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


