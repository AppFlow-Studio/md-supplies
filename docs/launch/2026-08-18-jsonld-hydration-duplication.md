# JSON-LD structured data duplicated on hydration (non-blocking)

**Logged:** 2026-08-18, per Bilal's instruction to track separately from the
P0.5/LG-04/Backorder PR — does not block that PR.

## Symptom

Both PDP routes (`/product/[slug]` and `/category/[slug]/[product]`) render
the `Product` and `BreadcrumbList` JSON-LD blocks twice in the live DOM after
hydration — 5 `<script type="application/ld+json">` tags instead of 3.

## What's confirmed

- The raw server-rendered HTML is correct: exactly 3 tags (verified via a
  direct `fetch()` of the page's own URL, before any client JS runs).
- The duplication happens client-side during hydration, not in the RSC
  render.
- It lines up with a pre-existing React hydration-mismatch console warning
  about the CSP `nonce` attribute differing between server and client on
  that exact script tag.
- Reproduces on a fresh full page load, not just client-side navigation.
- Predates this session — unrelated to the packaging-breakdown fields,
  `shippingReturns`, the Backorder ETA change, or the P0.5 shipping-copy
  removal.

## Suspected area

`app/layout.tsx`'s nonce-per-request handling and/or `productFetchOptions`'s
data-cache revalidation — where the CSP nonce (M10) is threaded onto
per-request script tags. Not investigated further this session.

## Why it matters

Duplicate structured data on the live DOM could affect SEO tools that read
the post-hydration page rather than the server-rendered source.

## Owner / next step

Needs whoever owns the CSP-nonce/caching architecture to reproduce and fix.
Not scoped or assigned as of this log.
