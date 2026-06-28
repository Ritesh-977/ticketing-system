import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow ngrok tunnels for Webpack HMR
  experimental: {
    serverSourceMaps: false,
  },
  // Note: Next.js 15 uses different options, but typically host header checking is disabled or managed via allowedDevOrigins in webpack.
  // Actually, for Next 15 it's typically:
};

// Next.js 15 dev origins
(nextConfig as any).experimental = {
    ...nextConfig.experimental,
    allowedOrigins: ["plus-chatty-flaccid.ngrok-free.dev", "*.ngrok-free.dev", "localhost:3001"]
};

export default nextConfig;
