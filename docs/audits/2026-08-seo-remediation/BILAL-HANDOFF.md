# Handoff to Bilal — hostname & environment fix (P0-01 / P0-02)

Two items from the 2026-08-21 Ahrefs audit are infrastructure config, not app code — they need Vercel/Cloudflare dashboard access to fix. Everything else in the audit's P0 list is being handled in code (see `docs/superpowers/plans/2026-08-24-seo-p0-remediation.md`), but these two block most of the rest of the audit's row counts, so they're the highest-leverage thing to fix first.

## Message to send Bilal

> **Two production config fixes needed — these are the root cause of most of the 2026-08-21 SEO audit findings.**
>
> **1. Apex↔www redirect is backwards.** `mdsupplies.com` is currently 308-redirecting to `www.mdsupplies.com`. It should be the other way — `www` redirects to the apex. This is documented as the intended setup in `docs/DEV-02-vercel-setup.md:105-109`, and the app code (`lib/seo/constants.ts` → `SITE_URL`) already assumes apex is canonical — every canonical tag, OG URL, and sitemap entry in the codebase emits the apex URL. Can you check which domain is set as primary in Vercel's Domains settings (or Cloudflare, if that's where the redirect actually lives per `docs/launch/2026-07-19-cutover-rollback-runbook.md:9-10,78-81`) and flip it so apex is primary and `www` 301/308s to it?
>   - If there's a business reason `www` should be the public domain instead, tell me and I'll flip `SITE_URL` in code instead — but that's a call for you/the team, not a default I should make.
>
> **2. `www.mdsupplies.com` is serving `noindex,nofollow` on every page.** About 3,743 ordinary pages (`/about`, `/faq`, `/category/*`, `/blog`, etc.) are rendering `<meta name="robots" content="noindex,nofollow">`. The app's robots logic (`lib/seo/robots.ts`) only emits that when `IS_STAGING` is true, which is driven by `VERCEL_ENV` (or a manual `NEXT_PUBLIC_IS_STAGING` override) — see `lib/site-config.ts:12-24`. Can you check whether the Vercel project/environment bound to whichever domain is actually serving live traffic has `VERCEL_ENV` resolving to something other than `production`, or has `NEXT_PUBLIC_IS_STAGING=true` set on it, and correct it?
>
> Given #1 shows apex and `www` are one hop apart on the *same* live deployment, this isn't pre-launch preview noise — it means the domain currently serving real traffic is telling Google not to index or follow anything on it. The audit shows real backlink/ranking data still attached to these URLs (e.g. `/collections/occ` has 5 referring domains, `/collections/needles` has 604 backlinks), so this reads as an active regression against an already-indexed site.
>
> Once both are flipped, most of the audit's canonical/redirect/indexability row counts should collapse on their own — I'll re-run the crawl after to confirm and pick up whatever's left.

## Why this can't be done from the codebase

- `lib/seo/canonical.ts` / `lib/seo/constants.ts` (`SITE_URL`) already resolve to the apex and are doing exactly what they should — the redirect direction is a Vercel Domains / Cloudflare DNS setting, external to this repo.
- `lib/seo/robots.ts` / `lib/site-config.ts` (`IS_STAGING`) already implement the correct staging-vs-production logic — what's wrong is which value `VERCEL_ENV`/`NEXT_PUBLIC_IS_STAGING` actually holds on the live deployment, which is set in Vercel's project/environment settings, not in this repo.

## What to do once this lands

Re-run the Ahrefs crawl and diff against the 2026-08-21 baseline. Per the master plan (§31), don't mark P0 complete solely because counts dropped — classify what's left into expected/intentional, true defect, third-party, or legacy-URL-still-propagating.
