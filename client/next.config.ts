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
  // Optimize images
  images: {
    unoptimized: false,
  },
  // Experimental features for performance
  experimental: {
    // optimizeCss: true, // Disabled due to critters dependency issue
  },
};

export default nextConfig;
