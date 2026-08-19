# Task 7 Report: Free Shipping display verification across all 7 surfaces

**Status: DONE_WITH_CONCERNS**
**Commits:**
- `f6a8ba8` — "docs(shipping): verify Free Shipping AND-gate across all 7 display surfaces" (findings doc)
- `bdac253` — "docs(shipping): correct Step 2 grep-methodology description, add task report" (round 1 post-review fixes: partial Step 2 methodology correction, added this report)
- this commit — round 2 post-review fixes: completed the Step 2 methodology correction (see "Post-review fixes" below) after a re-review found round 1 incomplete

**Docs-only task — no code or test files were changed.** No bypass of the
AND-gate was found anywhere, so there was nothing to fix.

## Summary

Read `lib/shipping-resolver/free-shipping-gate.ts`, `resolve.ts`, and
`copy.ts` fully and confirmed in the findings doc that a Free Shipping badge
requires **both** a resolver-confirmed `effective_rate_class === 'FREE'`
(`resolve.ts`'s `ratesConfirmFree`/`claimIsRatesGated`, feeding into the
`standard-free` class) **and** a truthy `custom.free_shipping` metafield
(`free-shipping-gate.ts`'s `gateFreeShippingClaim`, which only ever narrows a
`standard-free` result to `FALLBACK`, never the reverse) — quoting the exact
lines for both checks.

Grepped every display surface in `components/` and `app/` for
`free_shipping`/`freeShipping`/`shippingDisplay`/`FreeShipping` (the brief's
literal command) plus a case-insensitive follow-up for `ShippingDisplay`
(capital S) to catch identifiers the literal pattern's case-sensitivity
would otherwise miss (`attachCardShippingDisplay`/`attachCartShippingDisplay`
call sites in `app/page.tsx`, `components/category/CategoryResults.tsx`, and
`app/actions/cart.ts`). **No bypass found anywhere** — every hit reads a
pre-computed `shippingDisplay` value produced only by
`gateFreeShippingClaim`/`gateFreeShippingClaims`, or is part of the
gate/attach infrastructure itself. `lib/shopify/types.ts` explicitly
documents the raw metafield field as consumed only by the two attach
functions, matching what the code actually does.

Confirmed Step 3 (cross-surface consistency) is already satisfied by
existing test coverage — no new test was needed since no bug existed. Ran
the 13 relevant test files covering every surface (PDP, category/search
card, Quick Add, You May Also Need/Like, cart popup, cart page, homepage,
the gate's own truth table, and both attach-layer unit tests): **182/182
tests passed.**

For the live QA spot-check (Step 4), discovered two environment realities
that shaped what could be verified against real data:
1. `.env.local`'s default registry (`data/shipping-facts-v3.json`) is a
   **production** snapshot, and `shop-guard.ts` correctly refuses to load it
   against a QA-configured build (fail-closed, working as designed) — so the
   existing verify scripts self-abort as-is.
2. The QA store's product catalog is a full clone with real vendor names
   (Dukal, Trocar Supplies, Kadara Medical, real handles matching
   production), but the QA-compatible shipping-facts registry
   (`data/shipping-facts-qa.json`) is a 17-product synthetic fixture set with
   **no entries for any real Trocar/Kadara/OCC product** — so those
   real-catalog products always resolve to `unknown`/`FALLBACK` purely from
   registry absence, not from an evaluated rate result.

Ran all four requested spot-checks live (read-only,
`SHIPPING_RESOLVER_ENABLED=true SHIPPING_FACTS_PATH=data/shipping-facts-qa.json`,
same `resolveCardShippingDisplay`/`gateFreeShippingClaim` functions the app
uses):
- **Dukal $30 threshold** (QA's purpose-built fixture): no badge, as
  expected — `threshold` class isn't badge-eligible regardless of the gate.
- **Dukal inside OCC**: could not verify — no QA registry entry is both
  Dukal-vendored and rate-confirmed `standard-free`. Flagged as a QA
  data-coverage gap, not a code defect.
- **Trocar Supplies product** (`3-2mm-3-piece-resin-disposable-trocar-only-b6819`,
  real production handle, live in QA): metafield `custom.free_shipping` IS
  `"true"`, but the resolver returns `unknown` (product absent from the QA
  registry) — gate correctly leaves it unchanged, **no badge shown**. This
  is the single most important real-data result: a truthy metafield alone
  did not produce a badge, live, against a real catalog product.
- **Kadara product** (from `TROCAR-REGISTRY-41-PRODUCTS.csv`): metafield
  unset, no badge — matches expectation trivially.

Could not cross-reference the Trocar Supplies result against Izzy's "3
currently missing the flag" list — that list isn't in any tracked doc or the
plan file, only in Bilal's Slack message, which was never pasted into the
repo. Flagged as a follow-up for Bilal/Izzy directly.

## Post-review fixes (this commit)

1. **Step 2 methodology accuracy (round 1)** — the original doc presented
   several file:line citations (`app/search/page.tsx:133`, `app/page.tsx:81,85`,
   `components/category/CategoryResults.tsx:115`,
   `app/partners/[partner-slug]/page.tsx:37`, `app/actions/cart.ts`) as if
   they all came from running the brief's literal case-sensitive grep. A
   reviewer re-ran that exact command and confirmed `app/page.tsx`,
   `components/category/CategoryResults.tsx`, and `app/actions/cart.ts` do
   **not** appear in its output — they use capital-S `ShippingDisplay`
   naming (`attachCardShippingDisplay`/`attachCartShippingDisplay`), which
   the lowercase literal pattern doesn't match. Re-ran the literal grep
   myself to confirm (76 hits / 23 files — see round 2 below for the
   corrected file count), then edited Step 2 to state the two-pass
   methodology (literal grep, then a case-insensitive follow-up specifically
   for `ShippingDisplay` to close that gap) and marked every citation as
   *(literal-grep hit)* or *(follow-up hit)* accordingly.
2. **Step 2 methodology accuracy (round 2)** — round 1's relabeling was
   itself incomplete: it correctly moved the 3 whole-file cases
   (`app/page.tsx`, `CategoryResults.tsx`, `app/actions/cart.ts`, none of
   which literal-match at all) but missed that `app/search/page.tsx:133`
   and `app/partners/[partner-slug]/page.tsx:37` were still tagged
   *(literal-grep hits)* — the reviewer confirmed the literal grep does
   match elsewhere in each of those two files (`:130` and `:253`
   respectively) but not at the cited call-site line. Doing a full re-check
   of every citation against the literal grep's exact per-line output
   (rather than "does this file appear in the list") also caught a **third**
   mislabeled citation the reviewer hadn't flagged yet:
   `app/product/[slug]/page.tsx:116-117` was tagged literal-grep-hit but
   that file's literal matches are lines 22, 105, 110, 113 only — 116-117
   (the actual `attachCardShippingDisplay` calls) are capital-S-only, same
   root cause. Also corrected the file count from 22 to the actual 23
   (recounted via `grep -rln ... | wc -l`) and tightened one imprecise line
   range (`CartPageClient.tsx:43-45` → clarified only line 45 literal-matches,
   43-44 are source context for the same expression). Every citation in
   Step 2 was re-verified line-by-line against the literal grep's raw output
   before this pass was called done. The underlying conclusion (no bypass
   exists anywhere) has not changed at any point — only the doc's
   description of which search found which citation.
3. **This report** — was missing after the original commit; every prior
   task (1-6) in this ledger has a `task-N-report.md`, Task 7 did not.
   Added in round 1's commit, updated here for round 2.

## Files changed

- `docs/launch/2026-08-18-free-shipping-verification.md` — findings doc
  (created in the first commit; Step 2 section corrected in the follow-up
  commit).
- `.superpowers/sdd/2026-08-18-bilal-final-prelaunch-scope/task-7-report.md`
  — this report (new, follow-up commit).

No `lib/`, `components/`, or `app/` files were changed — no bypass existed
to fix.

## Concerns / follow-ups for human review

1. Ask Bilal/Izzy for the "3 currently missing the flag" Trocar Supplies
   product list so the live Trocar Supplies spot-check result can be
   properly classified as expected-vs-unexpected.
2. The Dukal-inside-OCC and general Trocar/Kadara **positive**-path
   (badge-shows) verification against real catalog products remains
   unverified in this QA-only environment — needs either a QA registry
   extended with a couple of real GIDs from these vendors, or explicit
   sign-off to run the existing read-only scripts against production
   Storefront credentials.
3. `components/product/ShippingBlock.tsx`, named in the task brief, does not
   exist on this branch (`catalog-cro-review-sardor-dev`) — only a stale,
   unrelated file of the same name exists in a different worktree. Noted as
   not applicable in the findings doc.
4. Unrelated files (`.superpowers/sdd/.../progress.md`,
   `docs/superpowers/plans/2026-08-18-bilal-final-prelaunch-scope.md`, and
   the `task-5`/`task-6`/`task-7` brief `.md` files) show as modified in the
   working tree but were not edited by me — not included in either commit,
   consistent with Task 6's report noting the same pattern (likely
   background SDD tooling or a concurrent session).
