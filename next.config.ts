import type { NextConfig } from "next";

// Content-Security-Policy is applied per-route in proxy.ts, not here: sensitive
// always-dynamic routes (/account, /search) get a fresh per-request nonce, which
// this static headers() config can't generate; public routes get a static policy
// so they can be CDN-cached. See lib/csp.ts (buildCsp / buildStaticCsp) and the
// spike/csp-static findings in docs/superpowers/plans/2026-07-12-csp-nonce-enforcement.md (M10).
const nextConfig: NextConfig = {
  // NOTE: experimental.sri (hash-based Subresource Integrity) was tried here as
  // defense-in-depth but REMOVED — with Turbopack it emits integrity hashes that
  // do NOT match the runtime chunks actually served, so the browser blocked
  // `turbopack-*.js` ("Failed to find a valid digest in the 'integrity' attribute
  // … The resource has been blocked"), which broke client JS/hydration on
  // deployed pages (navbar, forms, any prerendered page). Public routes constrain
  // scripts via script-src 'self' + the explicit host allowlist instead.

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
