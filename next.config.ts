import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pin the project root to this folder. Without it, Next walks up to the nearest parent lockfile,
  // which inside the AstroNest repo is the main app's.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
