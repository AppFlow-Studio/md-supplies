# Task 11 Report: Full redirect audit

## Summary

Built `scripts/audit-redirects.ts` (read-only, `server-only` + `--conditions=react-server`, same
pattern as the existing `scripts/verify-*.ts`/`scripts/audit-*.ts` scripts) and ran it against the
Storefront API to check every redirect entry in the codebase, then fixed the entries it confirmed
were genuinely dead.

**Coverage: 1,313 entries checked, exhaustively — not a sample.** 28 hand-written entries in
`proxy.ts#REDIRECT_ENTRIES` + 1,285 bulk rows in `docs/redirects-ready.json`. Exhaustiveness was
made tractable by paginating the whole catalog/collection set ONCE (`GET_ALL_PRODUCT_HANDLES` /
`GET_ALL_COLLECTION_HANDLES`, 250/page) into two in-memory Sets, then checking every entry's
destination against those Sets via O(1) lookup — roughly a dozen paginated requests total instead
of 1,313 one-off product queries.

- **Hand-written `proxy.ts` set (28 entries): 100% checked, 0 broken, 0 chained, 0 canonical
  mismatches.** This is the small human-curated set the brief required full coverage on.
- **Bulk `redirects-ready.json` set (1,285 entries): exhaustively checked, but the queried store's
  scope limits what a 404 there proves** (see "Critical environment finding" below). 1,151 of
  1,285 rows report their destination handle 404s against the store this script can reach; only 3
  of those are treated as confirmed-dead in this report.
- 0 redirect chains found anywhere (destination is itself a `from` key) — the "no chains" invariant
  documented at `proxy.ts:14-17` holds across the full combined set.
- 0 canonical-URL mismatches — confirmed at the code level: `lib/seo/canonical.ts`'s
  `buildCanonical()` defaults to the `'self'` strategy for every destination shape a redirect in
  this file lands on (bare paths, no query string), so canonical always equals the destination path.
  This did not require rendering all 1,313 destination pages live.

## Critical environment finding (this is the main finding of the task)

`.env.local`'s `SHOPIFY_STORE_DOMAIN` resolves to `md-supplies-qa-shipping-and-checkout.myshopify.com`
— a QA fixtures store, not production. `lib/shopify/shop-guard.ts` hardcodes the real production
domain (`daebb2-76.myshopify.com`) as "Never a permitted target on this branch," so, like every
other live-verification pass in this launch effort (DEV-LAUNCH-02/06/07/08/09/12/13), this script
cannot and does not query production.

Direct enumeration (not an estimate — full pagination of `GET_ALL_PRODUCT_HANDLES`) shows this QA
store carries only **1,088 live products**, versus `docs/launch/2026-08-14-status-and-screenshot-
checklist.md`'s reference to 10,001+ products in the real catalog (a metafield-population count,
so a floor, not a stated total — see Task 12 note below). Practically: a bulk-file `to` handle
404ing against this store very often means "not part of the QA fixture subset," not "dead in
production." Treating all 1,151 such 404s as confirmed breaks and category-fallback-fixing them
would likely have converted many genuinely-live production redirects into wrong destinations —
the opposite of what this audit exists to prevent.

**Corroboration standard applied (matching Task 10):** a bulk-file 404 was only treated as
confirmed-dead, and fixed, when independently corroborated the way Task 10 corroborated the
original hand-written Drape Sheet finding — a direct `product(handle:)` lookup for the target
handle AND a title/vendor search proving the *entire product line* is absent from the store, not
just the one target handle. Applying that standard one-by-one to the other ~1,148 QA-404 rows was
not feasible at this task's time/scope budget, so they are reported as **UNVERIFIED
(QA-subset-absent)** in `docs/launch/2026-08-18-redirect-audit-report.md`, not as confirmed
breakage — the report's summary states this distinction inline next to the "1,151 of 1,285" figure,
not just in a caveat a skimming reader could miss.

**Recommendation:** re-run `scripts/audit-redirects.ts` with production Storefront credentials
(through whatever process is approved to satisfy `shop-guard.ts`) before launch, treating this
run's bulk-file 404 list as the starting point for that pass rather than as confirmed breaks.

## Fix

Task 10 flagged, but explicitly deferred to this task, three sibling rows in
`docs/redirects-ready.json`'s bulk table sharing the exact dead-destination pattern as the
hand-written Drape Sheet White 40x60 entry it fixed: Drape Sheet White 40x90, 40x60, and 40x48
(all White→Blue), at what were lines ~4850-4861.

Applied the corroboration standard above to all three:
- Direct `product(handle:)` lookups for all five related handles (the White `from`-side handle and
  the Blue `to`-side handle, all three sizes) → all five return `null`.
- Title/vendor search for `"drape sheet"`, `"Graham Medical"`, and `"drape"` against the store →
  zero matching products or vendor, confirming (as Task 10 found for the 40x60 case specifically)
  the whole Drape Sheet line and Graham Medical vendor are absent store-wide, not just this one
  variant.

Changed all three rows' `to` field from the dead `-blue-` product handle to `/category/exam-room`,
matching Task 10's established no-live-handle fallback (already verified live via
`GET_COLLECTION_META`). Because `/category/exam-room` doesn't match the `^/products/` prefix,
`PRODUCT_REDIRECTS`'s `to.replace(/^\/products\//, '/product/')` rewrite is a no-op on it, so it
redirects there directly with no accidental mangling.

## TDD trail

1. Added a new test to `__tests__/proxy.test.ts` (in the "proxy — bulk product catalog 301s"
   describe block) asserting all three Drape Sheet White bulk rows redirect to
   `https://mdsupplies.com/category/exam-room`.
2. Ran it against unmodified `docs/redirects-ready.json` — failed as expected: `Expected:
   ".../category/exam-room" / Received: ".../product/drape-sheets-40-x-90-2-ply-blue-50-cs"`.
3. Applied the fix (three `to` fields in `docs/redirects-ready.json`).
4. Re-ran — passed. Full `__tests__/proxy.test.ts` suite: 82/82 passing (was 81 before this task's
   new test).
5. Full project suite: 145 files / 1,506 tests passing. `npx tsc --noEmit`: no errors.

## Verification run

- `NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-redirects.ts` — run twice: once
  before the fix (1,154 bulk-file 404s, confirming all three Drape Sheet rows among them) and once
  after (1,151 bulk-file 404s, confirming the fix removed exactly those three from the broken list
  and nothing else moved).
- Live Storefront API checks (read-only, no writes) for the corroboration above — ad-hoc diagnostic
  scripts were written to `scripts/_diag*.ts`, used, and deleted; nothing committed beyond the
  files listed below.
- `npx vitest run` (full suite): 145 files / 1,506 tests passed.
- `npx tsc --noEmit`: no errors.

## Files changed

- `scripts/audit-redirects.ts` (new) — the read-only audit script.
- `docs/launch/2026-08-18-redirect-audit-report.md` (new) — full 1,313-row table plus the
  environment-caveat and summary sections described above.
- `proxy.ts` — exported `REDIRECT_ENTRIES` and `GONE_CATEGORY_SLUGS` (both were previously
  module-private `const`; the audit script needs to import them) — no behavioral change.
- `docs/redirects-ready.json` — three rows' `to` field changed (see "Fix" above).
- `__tests__/proxy.test.ts` — one new test covering the three fixed rows.

## Commits

1. `bfe2604` — `fix(redirects): resolve dead Drape Sheet White bulk-table redirects (Task 11)`
   (`docs/redirects-ready.json` + `__tests__/proxy.test.ts`)
2. `6cc6fff` — `test(redirects): add full pre-launch redirect audit script and report`
   (`scripts/audit-redirects.ts` + `docs/launch/2026-08-18-redirect-audit-report.md` + `proxy.ts`)

## Concerns / notes for later tasks

- **The ~1,148 unresolved bulk-file 404s are a real open item**, not resolved by this task —
  they need either production catalog access to re-run this script against, or the same per-line
  vendor/title corroboration applied individually, which was out of this task's scope/time budget.
  See "Critical environment finding" above; the recommendation is a pre-launch re-run against
  production credentials.
- **Two data points about the QA store's relationship to production now exist and disagree** —
  worth Task 12 (or whoever does the production re-run) knowing both exist rather than assuming
  they're consistent: an earlier finding (Task 7) characterized the QA store as "a full clone" of
  production; this task's empirical full enumeration counted only 1,088 live QA products against a
  documented 10,001+ figure for production. Not reconciled here — flagged, not fixed.
- The "10,001+" production catalog figure this report's audit-report caveat cites is itself inferred
  from a metafield-population count in `docs/launch/2026-08-14-status-and-screenshot-checklist.md`
  ("Only 10,001 of the catalog's products carry a value"), not a stated total product count. The
  "+" suffix in this task's phrasing is deliberate — it signals a floor, not an exact total.
