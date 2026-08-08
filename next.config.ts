import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'utfs.io' },
      { protocol: 'https', hostname: 'squig.link' },
      { protocol: 'https', hostname: 'vsg.squig.link' },
      { protocol: 'https', hostname: 'cringraph.com' },
      { protocol: 'https', hostname: '*.squig.link' },
    ],
  },
};

export default nextConfig;
