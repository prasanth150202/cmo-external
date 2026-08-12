import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CMO Dashboard",
  description: "Multi-tenant ad operations platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={fraunces.variable}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
