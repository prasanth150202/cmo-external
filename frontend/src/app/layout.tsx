import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CMO Dashboard",
  description: "Multi-tenant ad operations platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
