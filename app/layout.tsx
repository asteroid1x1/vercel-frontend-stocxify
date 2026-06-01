import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "Stoxify - Get Real-Time Trade Ideas from SEBI-Registered Research Analysts",
  description:
    "Subscribe to verified SEBI-registered Research Analysts and receive real-time trading and investing ideas with entry, target, and stop-loss.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={plusJakartaSans.variable} lang="en">
      <body>{children}</body>
    </html>
  );
}
