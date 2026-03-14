import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const raw = process.env.NEXT_PUBLIC_API_URL || "";
    const apiUrl =
      raw.startsWith("http://") || raw.startsWith("https://")
        ? raw
        : "http://127.0.0.1:5000";
    return [
      { source: "/api/:path*", destination: `${apiUrl}/api/:path*` },
    ];
  },
};

export default nextConfig;
