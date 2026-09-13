import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "C Block Confessions | Galgotias University",
  description:
    "Anonymous confessions from C block, Galgotias University. Swipe through the wall.",
};

export const viewport: Viewport = {
  themeColor: "#f4ece0",
  width: "device-width",
  initialScale: 1,
  // Lets the page paint under the notch and home indicator; the layout pads
  // itself back out with env(safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
