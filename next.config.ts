import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/dashboard/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate"
          }
        ]
      },
      {
        source: "/login/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate"
          }
        ]
      },
      {
        source: "/cadastro/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate"
          }
        ]
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
