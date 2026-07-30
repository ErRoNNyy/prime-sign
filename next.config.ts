import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-lib", "@napi-rs/canvas"],
  experimental: {
    // Match Supabase documents bucket (20 MB); default Server Action limit is 1 MB
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
