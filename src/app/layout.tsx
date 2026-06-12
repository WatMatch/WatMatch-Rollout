import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { watmatchAuthLocalization } from "@/components/auth-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "WatMatch Past Capstones",
  description: "Read-only browser for University of Waterloo capstone archives.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider localization={watmatchAuthLocalization}>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
