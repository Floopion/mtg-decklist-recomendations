import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeSync } from "@/components/theme-sync";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MTG Decklist Recommendations",
  description:
    "AI-powered Commander/EDH deck analysis — get suggestions for cuts, additions, and mana base improvements.",
};

const portfolioUrl = process.env.NEXT_PUBLIC_PORTFOLIO_URL ?? "/";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans text-foreground antialiased`}
      >
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
          <nav
            aria-label="Primary navigation"
            className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4"
          >
            <a
              href={portfolioUrl}
              className="text-lg font-bold tracking-tight"
            >
              DB
            </a>
            <div className="flex items-center gap-6">
              <a
                href={portfolioUrl}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                &larr; Back to Portfolio
              </a>
            </div>
          </nav>
        </header>
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
