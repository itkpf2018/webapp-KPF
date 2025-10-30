import type { NextConfig } from "next";
import withPWAInit, { type RuntimeCaching } from "next-pwa";
import runtimeCaching from "next-pwa/cache";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: runtimeCaching as RuntimeCaching[],
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default withPWA(nextConfig);
