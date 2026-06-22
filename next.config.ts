import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server to be reached through ngrok. Next blocks cross-origin
  // dev requests by default, which breaks the HMR WebSocket and hydration when
  // the app is loaded from a tunnel host instead of localhost. The wildcards
  // cover any teammate's free ngrok tunnel (free domains come in both flavours).
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app"],
  images: {
    // localPatterns is an allowlist: once set, every other local next/image
    // src is blocked, so pre-existing local images (e.g. /images/logo.avif)
    // must be listed alongside the BunnyCDN proxy path.
    localPatterns: [{ pathname: "/api/bunny/**" }, { pathname: "/images/**" }],
  },
};

export default nextConfig;
