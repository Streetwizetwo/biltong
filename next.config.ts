import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking — admin login page can't be iframed
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Control referrer information leakage
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Lock down browser features we don't use
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          // Content Security Policy — biggest XSS mitigation
          // Allows: self, inline styles, Vercel analytics, Google Fonts, iKhokha payment redirects
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com",
              "img-src 'self' data: blob: https://fltjcycovhslqupmalfj.supabase.co",
              "connect-src 'self' https://fltjcycovhslqupmalfj.supabase.co https://api.ikhokha.com https://api.shiplogic.com https://sandbox.shiplogic.com https://api.portal.thecourierguy.co.za",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
          // HSTS — enforce HTTPS (1 year, include subdomains)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
