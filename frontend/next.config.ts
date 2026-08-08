import type { NextConfig } from "next";

// Set BACKEND_URL in Vercel's project env vars to your deployed Render
// backend URL (e.g. https://cmo-external-api.onrender.com) — this rewrite
// only defaults to localhost for local dev.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
