import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@/lib": path.resolve(__dirname, "lib"),
      "@/contexts": path.resolve(__dirname, "src/contexts"),
      "@/components": path.resolve(__dirname, "components"),
    };
    return config;
  },
};

export default nextConfig;
