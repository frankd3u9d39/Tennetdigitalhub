import type { NextConfig } from "next";

// Defence-in-depth HTTP headers applied to every response.
const securityHeaders = [
  // Force HTTPS for two years, including subdomains (Vercel serves everything over HTTPS).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // This app is never meant to be embedded, so forbid framing entirely (clickjacking defence).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Stop browsers guessing content types.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full URLs (which can carry references) to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // We don't use these device features; deny them.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
