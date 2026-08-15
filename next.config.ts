import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone bundles a self-contained server.js needed by Docker.
  // Vercel sets VERCEL=1 and handles its own packaging — standalone mode
  // switches it to a long-running Node server instead of serverless functions,
  // which breaks Vercel pricing and cold-start behaviour.
  output: process.env.VERCEL ? undefined : "standalone",
  images: {
    qualities: [75, 95],
  },
};

export default nextConfig;
