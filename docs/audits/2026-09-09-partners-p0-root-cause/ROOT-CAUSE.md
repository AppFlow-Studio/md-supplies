# Partners/Brands P0 — Root Cause Note

Date: 2026-09-09
Ticket: P0 production defect — broken/missing imagery on `/partners` and `/partners#brands` (follow-up to E4 Brands + BunnyCDN Asset Pipeline)
Branch: `catalog-cro-review`
Baseline SHA checked: `main` @ `ba35a14` (merge-base of `catalog-cro-review` and `main`)

## Summary

**The fix already exists in code. It was never deployed.** `main` — the branch
production almost certainly builds from — sits at `ba35a14` and does not
contain commit `76feafe` (`fix(partners): remove broken Figma asset URL and
white-on-white brand logos`, 2026-09-04), which is 80 commits ahead of `main`
on `catalog-cro-review`. Every symptom in the ticket is explained by
production still running the pre-`76feafe` code, not by a defect in the
current fix.

```
git merge-base main catalog-cro-review   → ba35a14 (== tip of main)
git log --oneline main..catalog-cro-review | wc -l   → 80
git branch --contains 76feafe            → catalog-cro-review only
```

## Root cause 1 — Hero image (`/partners`, `/partners#brands`)

`main`'s `app/partners/page.tsx` still has:

```ts
const HERO_IMAGE = 'https://www.figma.com/api/mcp/asset/7e97ac3a-09ed-42db-96c5-a2d21b722527'
```

This is a **Figma Dev-Mode MCP asset URL** — an ephemeral, session-scoped link
the Figma MCP server hands out while a developer is pulling design context
inside their own editor session. It is not a public, persistent asset host:
- It 404s for any request outside the originating Figma session (confirmed
  against production in the 2026-09-04 investigation).
- It was never added to the CSP `img-src` allowlist (`lib/csp.ts`), so even if
  it did resolve, the browser would block it as a second, independent failure
  mode.

This single line explains both hero symptoms in the ticket: it fails on
direct `/partners` load and on `/partners#brands` (the hash has no bearing on
it — the `<img src>` is broken regardless of where the page starts scrolled).

**Fix (already on `catalog-cro-review`, commit `76feafe`):** point `HERO_IMAGE`
at `/images/about/warehouse.png`, an image already shipped in `/public` and
serving correctly on the About page. No CDN/remote dependency, no CSP
exception needed.

## Root cause 2 — Lumex and 18 other blank brand cards

Not a null/missing logo field, and not a broken URL/404. The
2026-09-04 audit (`scripts/audit-brand-logos.ts`, re-run here to confirm)
found the uploaded logo files for these 19 brands **resolve HTTP 200 with a
valid image content-type** — they are technically correct network responses.
The defect is at the asset-content level: the uploaded artwork is
pure/near-pure white (`lumex.svg` renders as `#FFFFFF` fills throughout), so
on the white "Brands We Carry" card background the logo is present in the DOM
and paints successfully, but is visually invisible — a blank white region
with no broken-image icon and no console/network error, which is exactly why
it survives a status-code-only check and only shows up in a human QA pass.

Lumex specifically was only ever legible on the navy `/partners/lumex` detail
hero, which forces the mark white via a `brightness-0 invert` CSS filter —
that page-specific treatment masked the fact that the source asset itself has
no color/contrast of its own.

**Why this is a source-asset problem, not a pipeline bug:** the request path
(`brand/partner record → logo field → /api/bunny/brands/<file> → BunnyCDN →
browser`) works correctly end to end for these 19 files. Confirmed via the
same audit: 0 of 98 records have a 4xx/5xx logo response, 0 have a malformed
URL, 0 point at an inactive partner. There is nothing to fix in
`BrandLogoImage`, the Bunny proxy, or the brand registry's data model — the
uploaded artwork itself needs a correct (non-reversed / not embedded-white)
color variant re-uploaded to BunnyCDN before it can render. That re-upload is
outside this codebase's control.

**Fix applied in the interim (`76feafe`), already satisfying the ticket's
"no hard-coded `if (brand === 'lumex')`" constraint:** `logoFile` (brands.ts)
and `logo.url` (partners.ts) were cleared to empty/undefined for all 19
affected brands — Lumex included — through the *same* data-driven contract
every brand without a logo already uses, not a special case. `BrandLogoImage`
(`components/shared/BrandLogoImage.tsx`) already treats `!src` as "render the
text-label fallback"; clearing the field routes Lumex through that existing,
tested path. The fallback is a real element (`<span>{name}</span>`) sized by
its own text, not an empty container — the "blank region" in production is
exclusively a symptom of the pre-fix code still shipping the white-on-white
image.

## Root cause 3 — why this reached production QA at all

Both fixes landed same-day as the original 2026-09-04 brand-pipeline ticket,
on `catalog-cro-review`, and were never merged into `main`. Per
`docs/audits/2026-09-07-ticket-completion-review/TICKET-STATUS-EVIDENCE-GUIDE.md`,
this branch currently carries ~201 unmerged/undeployed commits against `main`,
and production (`www.mdsupplies.com`) is separately still serving
`noindex,nofollow` — i.e. there is a standing gap between "fixed on this
branch" and "live." This ticket is that gap made visible for Partners/Brands
specifically. It is a release-process issue, not a second code defect.

## What is NOT the cause (ruled out with evidence)

- Null/empty logo records — 0 unexplained; the 19 empty `logoFile`/`logo.url`
  values are intentional post-fix state, not missing data.
- Stale Shopify references — brand logos are BunnyCDN-only, no Shopify
  metafield in this path.
- Case-sensitivity / local-vs-deployed path mismatch — all 79 configured
  logos resolve 200 against the proxy; a case mismatch would 404, not render
  blank.
- Malformed/doubly-transformed URLs — `brandLogoUrl()` (`lib/brands.ts`)
  does single, direct string interpolation; audit confirms every resolved URL
  matches `/api/bunny/brands/<logoFile>` exactly.
- `next.config` `images`/`remotePatterns` — brand `<img>` tags are plain
  `<img>` (not `next/image`) served through the same-origin Bunny proxy, so
  remote-pattern config doesn't apply here.
- CSP blocking brand logos — proxy requests are same-origin
  (`/api/bunny/...`); only the Figma hero URL was CSP-relevant.
- Lazy-load/intersection-observer timing on `#brands` — the hero is `loading="eager"`; brand cards don't need eager loading to fix this class of bug since the failure is asset content, not load timing.

## Verification performed

- `git merge-base` / `git log main..catalog-cro-review` — confirms the fix
  commit is unmerged (above).
- `git show main:app/partners/page.tsx` — confirms `main` still has the
  literal `figma.com/api/mcp/asset/...` string.
- Read `lib/brands.ts`, `lib/partners.ts` on `catalog-cro-review` — confirms
  the 19 cleared records (including Lumex) and the inline comments dating the
  change to the 2026-09-04 audit.
- Read `components/shared/BrandLogoImage.tsx` — confirms the fallback path
  (`!src → text <span>`) is a real, tested rendering branch, not a gap.
- `docs/audits/2026-09-04-partners-brand-logo-audit.md` /
  `scripts/audit-brand-logos.ts` — machine-verified 98-record audit backing
  the "0 broken URLs, 0 invisible-on-white after the fix" claims above.

## Recommended next step

This is a merge/deploy gap, not an open code defect: merge (or otherwise
ship) `catalog-cro-review` — at minimum commit `76feafe` and its dependents —
to `main`/production. Re-run `scripts/audit-brand-logos.ts` and the
`e2e/evidence-capture.spec.ts`-style screenshot pass **against the deployed
production URL** after that ship to close out the ticket's required QA
evidence; capturing it against `main` today would just re-document the
already-understood pre-fix state.
