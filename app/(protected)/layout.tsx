import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Manrope } from 'next/font/google'
import '../globals.css'
import { SiteChrome } from '@/components/layout/SiteChrome'
import { SITE_ORIGIN } from '@/lib/site-config'

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: 'MDSupplies',
  description: 'Medical-Grade Supplies, Delivered Fast',
}

// Separate root layout ("multiple root layouts" — Next.js docs,
// api-reference/file-conventions/layout#root-layout) for /account and
// /search: the two routes proxy.ts's isStrictCspPath puts on the strict
// per-request-nonce CSP (lib/csp.ts buildCsp, 'strict-dynamic') instead of
// the static policy the rest of the site uses.
//
// Why this had to be a SEPARATE root, not just a nested layout: Cache
// Components (next.config.ts cacheComponents: true) prerenders a static PPR
// shell, and per Next's own CSP guide (node_modules/next/dist/docs/01-app/
// 02-guides/content-security-policy.md, "Static vs Dynamic Rendering with
// CSP"): "Partial Prerendering (PPR) is incompatible with nonce-based CSP
// since static shell scripts won't have access to the nonce." The single
// shared app/(site)/layout.tsx renders as exactly that kind of cached static
// shell (Header/Footer/framework runtime baked at prerender time, no request
// in scope to mint a nonce into). Nesting /account under it (the previous
// structure: app/(noindex)/account/layout.tsx wrapping its content in
// <Suspense>) only deferred the INNER account content to request time — the
// inherited (site) shell around it stayed static and nonce-less regardless.
//
// Confirmed in production (2026-09-20, QA report from Bilal — "most of the
// page's scripts" blocked, prescription upload unresponsive): a real
// `next build && next start` of /account shipped ~15 framework/runtime
// script chunks (Header, Footer, cart, the React/webpack runtime itself)
// with no `nonce` attribute at all — `x-nextjs-prerender: 1` /
// `x-nextjs-postponed: 1` on the response confirmed it was served from a
// prerendered shell with a resumed dynamic hole, exactly the incompatibility
// the docs describe. Under 'strict-dynamic' the browser refuses every one of
// those nonce-less scripts, which broke hydration for the ENTIRE page, not
// just the one button Bilal happened to notice.
//
// The <Suspense fallback={null}> wrapping <body> below is Next's documented
// fix (getting-started/caching.md, "Opting out of the static shell"): "Placing
// a <Suspense> boundary with an empty fallback above the document body in
// your Root Layout causes the entire app to defer to request time... To
// limit this to specific routes, use multiple root layouts" — which is
// exactly this file. Nothing under this root can be prerendered, so every
// Next-managed script here — framework chunks, Header/Footer/CartProvider's
// own hydration scripts — is rendered fresh per request and gets that
// request's real nonce automatically. The one script Next does NOT auto-nonce
// is the hand-authored Organization JSON-LD <script> in SiteChrome — that one
// reads the nonce itself via headers().get('x-nonce') and sets it explicitly
// (see SiteChrome's `strict` prop doc comment: reading headers() must stay
// gated to this group only, or it breaks static generation for the public
// (site) group the same way).
//
// Verified via a real `next build && next start` (2026-09-20): /account went
// from ~15 nonce-less script tags (the original bug) to zero.
//
// Trade-off, also called out in that same doc: "Navigating across multiple
// root layouts will cause a full page load" instead of a client-side
// transition. Entering or leaving /account or /search from the rest of the
// site now reloads the page. Accepted in exchange for /account and /search
// actually working under their strict CSP.
export default function ProtectedRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <Suspense fallback={null}>
        <body className="min-h-full flex flex-col">
          <SiteChrome strict>{children}</SiteChrome>
        </body>
      </Suspense>
    </html>
  )
}
