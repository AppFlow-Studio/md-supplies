import type { NextConfig } from "next";

// Content-Security-Policy (enforcing + Report-Only) is NOT set here: it needs
// a fresh nonce per request (lib/csp.ts), which this static headers() config
// can't generate — it runs once at build/server-start, not per request. Both
// CSP headers are set in proxy.ts instead. See
// docs/superpowers/plans/2026-07-12-csp-nonce-enforcement.md (M10).
const nextConfig: NextConfig = {
  // Allow the dev server to be reached through ngrok. Next blocks cross-origin
  // dev requests by default, which breaks the HMR WebSocket and hydration when
  // the app is loaded from a tunnel host instead of localhost. The wildcards
  // cover any teammate's free ngrok tunnel (free domains come in both flavours).
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app"],

  // Explicit: Next.js already omits source maps in production, but this
  // documents the intent in the config file.
  productionBrowserSourceMaps: false,

  images: {
    // AVIF preferred (≈20% smaller), WebP fallback for older browsers.
    formats: ["image/avif", "image/webp"],
    // localPatterns is an allowlist: once set, every other local next/image
    // src is blocked, so pre-existing local images (e.g. /images/logo.avif)
    // must be listed alongside the BunnyCDN proxy path.
    localPatterns: [{ pathname: "/api/bunny/**" }, { pathname: "/images/**" }],
    // Shopify product/variant images are served directly from cdn.shopify.com
    // (Storefront API image URLs) — these are remote, not local, so they need
    // an explicit remotePattern. BunnyCDN itself needs no entry here: it has no
    // public Pull Zone, so every BunnyCDN read already goes through the
    // same-origin /api/bunny proxy above (see lib/bunnycdn.ts).
    // TODO(trustshop-media-host): review media (components/reviews/ProductReviewMedia.tsx,
    // ReviewMediaModal.tsx) intentionally renders via plain <img>, not
    // next/image, until TrustShop's real media CDN host is known — a live
    // TRUSTSHOP_INTEGRATION_KEY hasn't been available yet to observe real
    // review-media URLs. Once known, add its remotePattern here and switch
    // those two components to next/image for AVIF/WebP + built-in
    // responsive sizing (aspect-ratio reservation is already handled
    // manually via inline styles either way, so this is a perf upgrade, not
    // a CLS fix).
    remotePatterns: [{ protocol: "https", hostname: "cdn.shopify.com", pathname: "/s/files/**" }],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "X-Frame-Options",          value: "SAMEORIGIN" },
          { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",       value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ]
  },
};

export default nextConfig;
