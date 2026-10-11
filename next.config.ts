import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.EPAPERS_NEXT_DIST_DIR || '.next',
  output: 'standalone',
  poweredByHeader: false,
  experimental: { cpus: 1 },
};

export default nextConfig;
