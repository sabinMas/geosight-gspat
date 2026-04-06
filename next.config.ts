import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
  transpilePackages: ["resium", "cesium"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default withSentryConfig(nextConfig, {
  // Suppresses source map upload logs during build
  silent: !process.env.CI,
  // Upload source maps to Sentry for readable stack traces
  widenClientFileUpload: true,
  // Hides Sentry SDK from bundle size analysis
  sourcemaps: { disable: false },
  // Disables Sentry's automatic tree shaking
  disableLogger: true,
  // Automatically instrument Next.js API routes
  autoInstrumentServerFunctions: true,
});
