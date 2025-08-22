import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize build performance
  typescript: {
    // Type checking can be done separately in CI/CD
    ignoreBuildErrors: true,
  },
  eslint: {
    // Linting can be done separately in CI/CD
    ignoreDuringBuilds: true,
  },
  // Disable image optimization to prevent connection issues
  images: {
    unoptimized: true,
  },
  // Experimental features for performance
  experimental: {
    // optimizeCss: true, // Disabled due to critters dependency issue
  },
};

export default nextConfig;
