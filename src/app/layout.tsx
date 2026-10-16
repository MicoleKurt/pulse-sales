import type { Metadata } from "next";
import { Outfit, Rajdhani } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// HOPE's type pairing: Rajdhani for display/labels, Outfit for body copy.
const display = Rajdhani({ variable: "--font-display", subsets: ["latin"], weight: ["500", "600", "700"] });
const body = Outfit({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pulse Sales",
  description: "Sales management for growing teams.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
