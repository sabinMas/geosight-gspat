import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import AgentPanel from "@/components/agent-panel/AgentPanel";
import { ThemeProvider } from "@/components/Theme/ThemeProvider";
import { validateAgentEnv } from "@/lib/agents/agent-config";
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
  title: "GeoSight — Spatial Intelligence Platform",
  description: "Ask questions about any place on Earth with geospatial data, AI reasoning, and interactive 3D map context.",
  icons: {
    icon: "/favicon.svg",
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
      <body className={`${dmSans.variable} ${jetBrainsMono.variable}`}>
        <ThemeProvider>
          <AgentPanel>{children}</AgentPanel>
        </ThemeProvider>
      </body>
    </html>
  );
}
