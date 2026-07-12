import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    // Keep visited routes in the client router cache so tab switches are
    // instant instead of refetching the RSC payload on every navigation.
    staleTimes: {
      dynamic: 300,
      static: 300,
    },
  },
};

export default nextConfig;
