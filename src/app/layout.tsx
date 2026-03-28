import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "GeoSight",
  description: "Ask questions about any place on Earth with geospatial data, AI reasoning, and interactive 3D map context.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${jetBrainsMono.variable}`}>{children}</body>
    </html>
  );
}
