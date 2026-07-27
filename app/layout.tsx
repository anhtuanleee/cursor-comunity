import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers/providers";

export const metadata: Metadata = {
  title: "Cursor Community – Design Inspiration",
  description: "Real-time collaborative design inspiration gallery. Browse, comment, and discover together.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white text-text-primary font-sans text-body antialiased min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
