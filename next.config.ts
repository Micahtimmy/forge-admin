import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@forge/services"],
  experimental: {
    externalDir: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/admin/:path*",
        destination: `${process.env.MAIN_APP_URL || "http://localhost:3000"}/api/admin/:path*`,
      },
    ];
  },
};

export default nextConfig;
