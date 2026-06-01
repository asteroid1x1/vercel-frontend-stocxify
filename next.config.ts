import type { NextConfig } from "next";

const ADMIN_PATH = "/admin/:path*";
const isDevelopment = process.env.NODE_ENV === "development";

const securityHeaders = [
  {
    key: "Cache-Control",
    value: "no-store, must-revalidate",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "no-referrer",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/admin",
        headers: securityHeaders,
      },
      {
        source: ADMIN_PATH,
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
