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
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
  // Skip release creation / source map upload when SENTRY_ORG isn't configured.
  sourcemaps: { disable: !process.env.SENTRY_ORG },
  webpack: {
    treeshake: { removeDebugLogging: true },
    autoInstrumentServerFunctions: true,
  },
});
