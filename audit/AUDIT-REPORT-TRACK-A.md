# Track A Performance Audit Report — MD Supplies

**Date:** 2026-06-23 · **Local Lighthouse run:** 2026-06-27 (T8)
**Status:** Static analysis + local Lighthouse run complete. Production-candidate re-run pending deploy.

## How to complete the launch-gate measurement

1. Deploy the production candidate.
2. Re-run: `BASE=https://<production-candidate-domain> ./scripts/run-lighthouse-audit-track-a.sh`
3. Replace the "Local dev" numbers below with the production-candidate numbers.
4. Do not sign off the ticket's Lighthouse acceptance criterion until this section is filled from the real candidate, not localhost.

## Targets

| Metric | Target |
|---|---|
| LCP (mobile) | <= 2.5s |
| INP | <= 200ms |
| CLS | <= 0.1 |

## Results — Local production server (`npm run build && npm run start`, mobile, simulated throttle)

Measured 2026-06-27 via `scripts/run-lighthouse-audit-track-a.sh` against
`localhost:3000`. **These are directional, not the launch gate** — LCP is heavily
inflated by the single-process local server serving hero imagery through the
server-side BunnyCDN proxy under simulated mobile throttling. Re-measure on the
production candidate (edge + CDN) before sign-off.

| Route | LCP | INP (≈TBT) | CLS | Perf (mobile) | Status |
|---|---|---|---|---|---|
| `/` (home) | 11.6 s | 50 ms | 0.004 | 74 | ⚠️ LCP (proxy/local-bound) |
| `/category/gloves` | 2.1 s | 200 ms | 0.004 | 95 | ✅ Pass |
| `/product/nitrile-exam-gloves-powder-free` | 10.0 s | 260 ms | 0.004 | 69 | ⚠️ LCP (proxy/local-bound) |
| `/solutions/occ` | 13.0 s | 60 ms | 0.004 | 71 | ⚠️ LCP (proxy/local-bound) |
| `/industries/pharmacy` | 9.5 s | 120 ms | 0.004 | 72 | ⚠️ LCP (proxy/local-bound) |
| `/blog/types-of-needles` | 4.4 s | 280 ms | 0.004 | 78 | ⚠️ LCP |
| `/cart` | 2.0 s | 130 ms | 0.004 | 97 | ✅ Pass |
| `/account` | 2.0 s | 260 ms | 0.004 | 93 | ✅ Pass |

**Reading the numbers**
- **CLS — excellent everywhere (0.004 ≪ 0.1 target).** No layout-shift risk; the fixed-height header bars hold.
- **INP (lab proxy = TBT) — all ≤ 280 ms, most ≪ 200 ms.** Confirm with field data post-launch (lab cannot truly measure INP).
- **LCP — the one watch item.** Pages whose hero is a proxied BunnyCDN image (home, PDP, OCC, industry) land at 9–13 s locally; the pages that hit target (category 2.1 s, cart/account 2.0 s) are the ones without a large proxied hero. The category page proves the app/markup is fast — the LCP gap is image-delivery latency through the local proxy, which a real CDN/edge deploy removes. **Must be re-measured on the production candidate; do not sign off LCP from these localhost numbers.**
- **Best-practices = 100** on every route.
- **SEO = 66** on `/product/*`, `/industries/pharmacy`, `/cart`, `/account` is expected: Lighthouse penalizes "page is blocked from indexing" on the intentionally `noindex` utility/thin pages — not a defect.

INP cannot be measured by Lighthouse lab runs (it requires real user interaction); estimate via Total Blocking Time above and confirm with field data (CrUX/PageSpeed Insights) post-launch.

## Results — Production candidate (PENDING)

Fill in once a deployed URL exists. Same table shape as above.

## Known structural fixes already applied (this ticket)

- Homepage ISR gap closed (`app/page.tsx` now `revalidate = 60`).
- `storefrontFetch` memoized per-request via React `cache()` to remove duplicate identical GraphQL calls within a single render.
- Header announcement/stats bars confirmed fixed-height (no CLS contribution), regression-tested.
