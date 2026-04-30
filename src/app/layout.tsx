import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { WebVitalsReporter } from "@/components/App/WebVitalsReporter";
import AgentPanel from "@/components/agent-panel/AgentPanel";
import { ThemeProvider } from "@/components/Theme/ThemeProvider";
import { UserPreferencesProvider } from "@/context/UserPreferencesContext";
import { validateAgentEnv } from "@/lib/agents/agent-config";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  weight: ["300", "400", "500"],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const SITE_URL = "https://geosight-gspat.vercel.app";

export const metadata: Metadata = {
  title: "GeoSight — Spatial Intelligence Platform",
  description:
    "Ask questions about any place on Earth with geospatial data, AI reasoning, and interactive 3D map context.",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.svg",
  },
  other: {
    "theme-color": "#07111d",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "GeoSight — Spatial Intelligence Platform",
    description:
      "Ask questions about any place on Earth with geospatial data, AI reasoning, and interactive 3D map context.",
    siteName: "GeoSight",
  },
  twitter: {
    card: "summary_large_image",
    title: "GeoSight — Spatial Intelligence Platform",
    description:
      "Ask questions about any place on Earth with geospatial data, AI reasoning, and interactive 3D map context.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  validateAgentEnv();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${jetBrainsMono.variable}`}>
        <Script id="theme-init" strategy="beforeInteractive" src="/theme-init.js" />
        {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ThemeProvider>
          <UserPreferencesProvider>
            <WebVitalsReporter />
            <AgentPanel>{children}</AgentPanel>
          </UserPreferencesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
