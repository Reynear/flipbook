import type { Metadata } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ConvexClientProvider } from "./convex-provider";
import "./globals.css";

const sora = Sora({ 
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

const jetbrains = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flipbook - Transform PDFs into Interactive Flipbooks",
  description: "Upload PDFs and create shareable, interactive flipbooks with page-turning animations. No sign up required.",
  keywords: ["PDF", "flipbook", "document viewer", "interactive", "page flip"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sora.variable} ${jetbrains.variable}`}>
      <body className="font-sans">
        <ConvexClientProvider>{children}</ConvexClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
