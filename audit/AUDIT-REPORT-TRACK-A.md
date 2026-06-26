# Track A Performance Audit Report — MD Supplies

**Date:** 2026-06-23
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

## Results — Local dev server (`localhost:3000`, `npm run dev`)

| Route | LCP | INP | CLS | Lighthouse (mobile) | Status |
|---|---|---|---|---|---|
| `/` (home) | — | — | — | — | Pending: run script |
| `/category/[slug]` | — | — | — | — | Pending: run script |
| `/product/[slug]` | — | — | — | — | Pending: run script |
| `/solutions/occ` | — | — | — | — | Pending: run script |
| `/industries/[slug]` | — | — | — | — | Pending: run script |
| `/blog/[handle]` | — | — | — | — | Pending: run script |
| `/cart` | — | — | — | — | Pending: run script |
| `/account` | — | — | — | — | Pending: run script |

INP cannot be measured by Lighthouse lab runs (it requires real user interaction); estimate via Total Blocking Time in the same report and confirm with field data (CrUX/PageSpeed Insights) post-launch.

## Results — Production candidate (PENDING)

Fill in once a deployed URL exists. Same table shape as above.

## Known structural fixes already applied (this ticket)

- Homepage ISR gap closed (`app/page.tsx` now `revalidate = 60`).
- `storefrontFetch` memoized per-request via React `cache()` to remove duplicate identical GraphQL calls within a single render.
- Header announcement/stats bars confirmed fixed-height (no CLS contribution), regression-tested.
