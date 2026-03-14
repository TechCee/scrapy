import type { Metadata } from "next";
import { Source_Sans_3, JetBrains_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
import { AuthProvider } from "@/contexts/AuthContext";
import { BackendStatusProvider } from "@/contexts/BackendStatusContext";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trustle",
  description: "Search by job title, find people and emails",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sourceSans.variable} ${jetbrainsMono.variable} antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <BackendStatusProvider>
            <AppShell>{children}</AppShell>
          </BackendStatusProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
