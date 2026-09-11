import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["sandpaper-uniformed-sinless.ngrok-free.dev"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/:path*",
      },
    ];
  },
};

export default nextConfig;