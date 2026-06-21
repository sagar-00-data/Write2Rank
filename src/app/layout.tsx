import "./globals.css";

import AppContent from "@/components/AppContent";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        
          <AppContent>{children}</AppContent>
        
      </body>
    </html>
  );
}
