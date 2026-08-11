import type { Metadata } from "next";
import { Inter, Kalam } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ClickSound } from "@/components/click-sound";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const kalam = Kalam({
  variable: "--font-handwriting",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Trung Vo's Portfolio",
  description:
    "Product designer who ships — a decade of interfaces, told in the order they were built.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${kalam.variable} h-full font-sans antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" disableTransitionOnChange>
          <ClickSound />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
