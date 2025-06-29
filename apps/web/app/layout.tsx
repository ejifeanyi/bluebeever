import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const basiercircle = localFont({
  src: "./fonts/basiercircle-regular-webfont.woff",
  variable: "--font-basiercircle",
});

export const metadata: Metadata = {
  title: "BlueBeever",
  description: "Organize, search, and discover your emails effortlessly",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${basiercircle.variable}`}>
        {children}
      </body>
    </html>
  );
}
