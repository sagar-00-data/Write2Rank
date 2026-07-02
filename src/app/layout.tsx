import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import AppContent from "@/components/AppContent";
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
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

