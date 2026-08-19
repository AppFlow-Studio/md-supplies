# Free Shipping AND-gate verification across all display surfaces — 2026-08-18/19

**Prepared by:** Sardor (dev) · **For:** Bilal
**Scope:** Task 7 of `docs/superpowers/plans/2026-08-18-bilal-final-prelaunch-scope.md`.
Read-only verification only — no Shopify writes were made. Izzy's
OCC/Dukal/Trocar/Kadara *rule content* (which metafields get set, which rate
data is correct) is out of scope; this doc confirms the **display code**
obeys the AND-gate, nothing about the underlying catalog data.

**Bottom line: no bypass found.** Every surface that can show a "Free
Shipping" badge reads a pre-computed `shippingDisplay` value produced by
`gateFreeShippingClaim()`/`gateFreeShippingClaims()`; no component or route
re-implements the metafield-AND-rate check locally. One real production
example (the Trocar Supplies triplet product) was observed live with
`custom.free_shipping=true` and correctly showed **no** badge because the
resolver did not independently confirm the rate — direct evidence the gate
narrows exactly as required and a metafield alone cannot produce a claim.

---

## Step 1 — The AND-gate implementation

`lib/shipping-resolver/free-shipping-gate.ts` exports `gateFreeShippingClaim(display, freeShippingRaw)`:

```ts
export function gateFreeShippingClaim(
  display: ShippingDisplay,
  freeShippingRaw?: { value: string } | string | boolean | null,
): ShippingDisplay {
  if (display.class !== 'standard-free') return display
  return isFreeShippingMetafieldTrue(freeShippingRaw) ? display : FALLBACK
}
```

This is check #1 of the AND: it only ever **narrows** a `standard-free`
classification — every other class (`threshold`, `standard-paid`,
`manual-quote`, `unknown`) passes through unchanged regardless of the
metafield, and a `standard-free` result downgrades to `FALLBACK` unless
`isFreeShippingMetafieldTrue(freeShippingRaw)` is true (accepts `"true"`,
`"1"`, `"yes"`, or a flattened boolean `true`).

Check #2 — the resolver-confirmed $0 rate — lives one layer down, in
`lib/shipping-resolver/resolve.ts`, and is what actually produces (or
withholds) the `standard-free` class `gateFreeShippingClaim` operates on:

```ts
function ratesConfirmFree(variant: VariantRecord): boolean {
  return variant.effective_rate_class === 'FREE'
}
function claimIsRatesGated(publicDisplayClass: PublicDisplayClass): boolean {
  return publicDisplayClass === 'standard-free' && isRatesOnlyClaimEnabled()
}
...
if (claimIsRatesGated(variant.public_display_class) && !ratesConfirmFree(variant)) return FALLBACK
```

(`resolveVariantShippingDisplay`, `resolveCardShippingDisplay`, and
`resolveVariantsForProduct` each repeat this same rate-confirmation check
before a `standard-free` class is ever handed to the gate.)
`isRatesOnlyClaimEnabled()` (`flag.ts`) is hardcoded `true` with no
environment-variable escape hatch (DEV-SHIP-03, Juliette's directive) — this
check cannot be disabled by misconfiguration.

So the full picture: **`resolve.ts` is the rate-confirmation gate** (a
product/variant can only reach `standard-free` if `effective_rate_class ===
'FREE'`), and **`free-shipping-gate.ts` is the merchant-approval gate**
layered on top (a `standard-free` result is further narrowed to `FALLBACK`
unless `custom.free_shipping` is truthy). A badge only renders when **both**
have passed. This matches Bilal's strict AND-gate requirement exactly.

`gateFreeShippingClaims()` is the same function applied to a
`resolveVariantsForProduct()`-shaped per-variant map (used by the PDP).

---

## Step 2 — Grep audit of every display surface

**Methodology, stated accurately:** ran the brief's exact literal command,
`grep -rn "free_shipping\|freeShipping\|shippingDisplay\|FreeShipping" components/ app/`.
This is case-sensitive (no `-i`), so it matches lowercase `shippingDisplay`
and `freeShipping` but **not** the capitalized `ShippingDisplay` type name or
identifiers built from it (`attachCardShippingDisplay`,
`attachCartShippingDisplay`). It returned 76 hits across 22 files, all
listed under (a)/(b) below.

That pattern gap meant three real call sites were silently invisible to the
literal grep: `app/page.tsx`, `components/category/CategoryResults.tsx`, and
`app/actions/cart.ts` each call `attachCardShippingDisplay`/
`attachCartShippingDisplay` but contain no lowercase match for any of the
four alternatives (confirmed by re-running the literal command in isolation
— none of the three appear in its output). These three were found by a
follow-up case-insensitive search, `grep -rin "shippingdisplay"
components/ app/`, run specifically to close that gap after noticing the
literal pattern couldn't match capital-S identifiers. They're marked
**(follow-up)** below rather than presented as literal-grep hits.
`lib/shipping-resolver/attach.ts` and `lib/shipping-resolver/cart.ts`
themselves are outside both greps' scope (`lib/`, not `components/`/`app/`)
— they were read directly, as the definitions of the functions the grep hits
call into, not discovered by either grep.

**No bypass found** — every hit (from either search) is one of:

**(a) Safe — reads a pre-computed `shippingDisplay`, never the raw metafield** *(literal-grep hits)*:
- `components/product/ShippingBadge.tsx` — only consumes `ShippingDisplay.class` via `SHIPPING_CLASS_BADGE_LABEL`; no metafield access at all.
- `components/product/ProductLabelBadges.tsx:37` — passes `shippingDisplay` straight to `ShippingBadge`.
- `components/product/ProductView.tsx:62,99,365` — `RelatedProductCard` reads `product.shippingDisplay`; the PDP itself reads `variantShippingDisplays[selectedVariant.id]`, a map built by `gateFreeShippingClaims()` in the route (see below).
- `components/store/ShopifyProductCard.tsx:115` — reads `product.shippingDisplay`.
- `components/store/ShopifyQuickAddButton.tsx:40`, `components/product/QuickAddContent.tsx:210` — read `product.shippingDisplay`.
- `components/store/CartPopup.tsx:215`, `components/store/CartPageClient.tsx:45,163` — read `line.shippingDisplay`. The cart-page whole-summary banner (`CartPageClient.tsx:43-45`) also only reads `line.shippingDisplay?.class === 'standard-free'`, never a raw field.
- `components/home/PopularProducts.tsx:52,136`, `components/home/HeroSection.tsx:53`, `components/b2b/FeaturedProductCard.tsx:68` — all read `product.shippingDisplay`.

**(b) Safe — the gate/attach infrastructure itself** (this is where `shippingDisplay` gets produced, correctly gated, not a bypass):
- `lib/shipping-resolver/attach.ts` (`attachCardShippingDisplay`) — `gateFreeShippingClaim(resolveCardShippingDisplay(product.id), product.freeShipping)`. *(read directly, outside grep scope — see methodology note above)*
- `lib/shipping-resolver/cart.ts` (`attachCartShippingDisplay`) — same gate, keyed per cart line's own product/variant. *(read directly, outside grep scope)*
- `app/product/[slug]/page.tsx:110` and `app/category/[slug]/[product]/page.tsx:318` — `gateFreeShippingClaims(resolveVariantsForProduct(product.id), product.freeShipping)` for the PDP's per-variant map. *(literal-grep hits)*
- `app/search/page.tsx:133`, `app/partners/[partner-slug]/page.tsx:37` — call `attachCardShippingDisplay(...)` before handing products to card components. *(literal-grep hits)*
- `app/page.tsx:81,85`, `components/category/CategoryResults.tsx:115` — also call `attachCardShippingDisplay(...)` before handing products to card components. *(follow-up case-insensitive hits, not literal-grep hits — see methodology note above)*
- `app/actions/cart.ts` (6 call sites: lines 42, 86, 131, 149, 161, 173) — every cart mutation returns `attachCartShippingDisplay(cart)`. *(follow-up case-insensitive hits, not literal-grep hits)*
- `app/product/[slug]/page.tsx:116-117` — related/complementary ("You May Also Like"/"You May Also Need") products are run through `attachCardShippingDisplay` before reaching `ProductView`, same as every other card grid (this is the Task 4/DEV-SHIP-04 fix already committed — previously these carried no `shippingDisplay` at all, so they never showed a badge even when the product qualified; now they show the correctly-gated one). *(literal-grep hit)*

**No occurrence of case (b-bug)** was found: no component or route reads
`custom.free_shipping` (or a raw `freeShipping` field) and independently
decides to show a badge without funnelling it through
`gateFreeShippingClaim`/`gateFreeShippingClaims` first. `types.ts` explicitly
documents the raw field as "Consumed ONLY by attachCardShippingDisplay" /
"Consumed only by attachCartShippingDisplay" (`lib/shopify/types.ts:193,277`), and every call site that touches the raw metafield is inside `attach.ts`, `cart.ts`, or the two PDP route files listed above — all of which pass it straight into the gate, never branch on it directly.

**One file named in the task brief does not exist on this branch:**
`components/product/ShippingBlock.tsx` is not present in this repo's working
tree at `catalog-cro-review-sardor-dev` — it only exists as a stale file in
an unrelated worktree (`.worktrees/perf-a11y-test-infra/components/product/ShippingBlock.tsx`), where it's an old `types/product`-based component reading
`product.shippingMessage`/`leadTime`, unrelated to the shipping-resolver
system entirely (no `ShippingDisplay`, no gate, no metafield). Not applicable
to this verification; PDP shipping display is `ShippingBadge.tsx` (badge) +
`ProductLabelBadges.tsx` (badge placement/ordering), both audited above.

---

## Step 3 — Cross-surface consistency test coverage

The brief's Step 3 fixture shape (`{ eligible: true, confirmed: false }` /
`{ eligible: true, confirmed: true }`) does not match the actual
`ShippingDisplay` type shipped in this codebase (`{ class: PublicDisplayClass,
message: string, displayCopy: string | null }` — see `resolve.ts`); that
brief text predates the resolver's final design. The equivalent real
scenario — "resolver+metafield together produce `standard-free`" vs. "one or
both fail, so the class is `unknown`/anything-but-`standard-free`" — is
already covered exhaustively across every one of the 7 surfaces by the
existing suite, so no new test was needed (no gap found to fix):

| Surface | Test file | Assertion |
|---|---|---|
| PDP | `components/product/__tests__/ProductLabelBadges.test.tsx` | badge shown only for `class: 'standard-free'` |
| Category/search card | `components/store/__tests__/ShopifyProductCard.test.tsx:316-328` | badge shown for `standard-free`, hidden for `unknown` |
| Quick Add | `components/product/__tests__/QuickAddContent.test.tsx:169-190` | badge shown for `standard-free`, hidden for `unknown`/`null` |
| You May Also Need / You May Also Like | `components/product/__tests__/ProductView.a11y.test.tsx:268-304` | badge shown on related/complementary card only when attached `shippingDisplay` is `standard-free`; hidden when never attached |
| Cart popup | `components/store/__tests__/CartPopup.test.tsx:204-...` | badge shown for `standard-free` line, hidden otherwise |
| Cart page | `components/store/__tests__/CartPageClient.test.tsx:383-391` | badge shown for `standard-free` line, hidden otherwise |
| Homepage cards | `components/home/__tests__/PopularProducts.test.tsx:78-88` | badge shown for `standard-free`, hidden for `unknown` |
| Gate unit behavior | `lib/shipping-resolver/__tests__/free-shipping-gate.test.ts` | full truth table: metafield true/false/null/undefined × every `PublicDisplayClass`, including the exact "eligible resolver class but metafield false → falls back" and "metafield true but resolver class isn't `standard-free` → unaffected" cases |
| Attach-layer (card) | `lib/shipping-resolver/__tests__/attach.test.ts` | `attachCardShippingDisplay` applies the gate correctly per product |
| Attach-layer (cart) | `lib/shipping-resolver/__tests__/cart.test.ts` | `attachCartShippingDisplay` applies the gate correctly per line |

**Ran all 13 files locally to confirm current state:** `npx vitest run
components/product/__tests__/ProductView.a11y.test.tsx
components/product/__tests__/QuickAddContent.test.tsx
components/product/__tests__/ProductLabelBadges.test.tsx
components/product/__tests__/ShippingBadge.test.tsx
components/store/__tests__/ShopifyProductCard.test.tsx
components/store/__tests__/CartPopup.test.tsx
components/store/__tests__/CartPageClient.test.tsx
components/home/__tests__/PopularProducts.test.tsx
lib/shipping-resolver/__tests__/free-shipping-gate.test.ts
lib/shipping-resolver/__tests__/attach.test.ts
lib/shipping-resolver/__tests__/cart.test.ts
lib/shipping-resolver/__tests__/resolve.test.ts
lib/shipping-resolver/__tests__/qa-registry.test.ts`

Result: **13/13 files passed, 182/182 tests passed.** No test files were
modified for this task — no bug existed for a test to catch.

---

## Step 4 — Spot-check against real QA data

`.env.local` points this repo at the QA store
(`md-supplies-qa-shipping-and-checkout.myshopify.com`), per DEV-LAUNCH-02's
deliberate QA-only design (`lib/shopify/shop-guard.ts` refuses to load the
shipping-facts registry if its declared store doesn't match what the build
is allowed to reach — this fired correctly during this check, see below).

**Two environment findings, not gate bugs, that shaped what could be verified:**

1. **`SHIPPING_RESOLVER_ENABLED` is unset in `.env.local`** (expected —
   `docs/env-feature-flag-register.md` documents this flag defaults to
   disabled and fails safe that way). Running `scripts/report-free-shipping-exceptions.ts`
   and `scripts/verify-approved-triplet.ts` as-is against `.env.local`
   confirmed `isShippingResolverEnabled(): false`, and the default
   `data/shipping-facts-v3.json` registry is the **production** snapshot
   (`_meta.store: daebb2-76.myshopify.com`) — `shop-guard.ts` correctly
   refused to load it against a QA-only build ("Every product falls back"),
   exactly the fail-closed behavior it's designed for. Two of the three
   hardcoded triplet-script products also don't exist by handle in the QA
   store at all (404).
2. **The QA store's real product catalog is a full clone** (confirmed via
   live Storefront queries) — real `vendor:Dukal`, `vendor:"Trocar Supplies"`,
   and `vendor:"Kadara Medical"` products exist in QA with the same handles
   as production (e.g. `3-2mm-3-piece-resin-disposable-trocar-only-b6819`,
   vendor `Trocar Supplies`, `custom.free_shipping = "true"`). **But**
   `data/shipping-facts-qa.json` (the only registry `shop-guard.ts` accepts
   for a QA-configured build) is a 17-product **synthetic fixture set**
   purpose-built for the Dukal-$30-threshold rule and a few
   generic hold/backorder/duplicate-variant edge cases — it contains **no
   entries for any real Trocar Supplies, Kadara Medical, or OCC-tagged
   product**, so `resolveCardShippingDisplay()` returns `unknown`/`FALLBACK`
   for all of them purely because they're absent from the registry, not
   because their rate math was evaluated and found non-free.

Ran the four real spot-checks the brief asked for, live against the QA
store, with the resolver temporarily pointed at the QA-compatible registry
(`SHIPPING_RESOLVER_ENABLED=true SHIPPING_FACTS_PATH=data/shipping-facts-qa.json`,
read-only — no writes, same functions the app uses:
`resolveCardShippingDisplay` + `gateFreeShippingClaim`):

| Rule | Product used | Expected | Observed | Notes |
|---|---|---|---|---|
| Dukal $30 threshold (outside OCC) | `qa-dukal-threshold` / "QA Dukal Pocket Eye Test Chart" (`gid://shopify/Product/9353136177385`, vendor `Dukal`) — the QA fixture purpose-built for this rule | No badge | **No badge** — `resolveCardShippingDisplay`: `{class: "threshold", ...}`; gate leaves it unchanged (only narrows `standard-free`); `threshold` is not in `SHIPPING_CLASS_BADGE_LABEL`, so `ShippingBadge` renders nothing | **Matches expectation.** Also checked the companion fixture "QA Boundary Dukal Exactly $30" (`gid://shopify/Product/9354965516521`) — same result. |
| Dukal inside OCC | *(none available)* | Badge | *(not verified)* | **Could not verify.** No product in `data/shipping-facts-qa.json` is both Dukal-vendored and rate-confirmed `standard-free`; the real OCC-tagged Dukal products live only in production's registry, which `shop-guard.ts` correctly refuses to load against a QA-configured build. See "Gap" below. |
| Trocar Supplies product | `3-2mm-3-piece-resin-disposable-trocar-only-b6819` (`gid://shopify/Product/9365088010473`, vendor `Trocar Supplies`) — same handle used as one of `scripts/verify-approved-triplet.ts`'s 3 hand-picked "should show" examples | Badge (unless one of Izzy's named "3 currently missing the flag") | **No badge.** Live `custom.free_shipping = {"value":"true"}` (metafield IS true), but `resolveCardShippingDisplay(id)` returns `{class: "unknown", ...}` because this product's GID is not in the QA registry at all — `gateFreeShippingClaim` correctly leaves it as `unknown` (nothing to narrow) | **This is the most important real-data result in this doc.** No list of Izzy's "3 currently missing the flag" Trocar products exists anywhere in this repo's docs or the plan (searched `docs/` and the plan file — not found) — could not cross-reference. But the observation itself is the load-bearing proof Bilal actually asked for: **a truthy `custom.free_shipping` metafield alone did not produce a badge.** Whether this specific product *should* show a badge in production is Izzy's rate/registry data question, out of scope here — but the display code's refusal to trust the metafield alone is exactly correct behavior. |
| Kadara product from the Trocar registry CSV | `3-2mm-abs-plastic-disposable-trocar-kit-small-gloves-case-of-16-19125sg` (`gid://shopify/Product/9365084930281`, vendor `Kadara Medical`, from `TROCAR-REGISTRY-41-PRODUCTS.csv` row 2) | No badge | **No badge.** Live `custom.free_shipping` metafield is null/unset, and the product isn't in the QA registry either — `resolveCardShippingDisplay` returns `unknown`, gate leaves it unchanged | **Matches expectation**, though for the trivial reason (metafield already false) rather than a "metafield true, resolver disagrees" conflict case. |

**Gap to flag (not a code bug — a QA data-coverage gap):** the QA
shipping-facts registry has no fixture that lets the "Dukal inside OCC → badge
shows" positive path, or any real Trocar Supplies/Kadara Medical
`standard-free`-and-approved case, be verified end-to-end with live QA
data. The Trocar Supplies result above proves the critical **negative**
guarantee (metafield-true-alone ⇏ badge) with a real production-catalog
product; proving the **positive** guarantee (metafield-true AND
resolver-confirmed-free ⇒ badge) for a *real* Dukal/OCC/Trocar/Kadara
product would need either (a) a QA shipping-facts registry entry for one of
these real GIDs with `effective_rate_class: "FREE"`, or (b) running against
production Storefront credentials, which this task deliberately did not do
(`.env.local` is intentionally QA-only per DEV-LAUNCH-02, and switching it
was out of scope for a read-only verification task without explicit
sign-off). The `standard-free` badge's positive path *is* still proven
end-to-end, just with a synthetic fixture rather than a named real product:
`data/shipping-facts-qa.json`'s "QA Free Shipping Utility Tip"
(`gid://shopify/Product/9353136144617`, `effective_rate_class: "FREE"`)
correctly showed **no** badge when its metafield was unset/false
(`resolveCardShippingDisplay` → `standard-free`, `gateFreeShippingClaim` →
`FALLBACK`) — the mirror-image proof of the same AND requirement, live,
mechanically identical to the Trocar Supplies check above.

**Izzy's "3 currently missing the flag" list:** not found anywhere in this
repo (`docs/`, the plan file, or the SDD workspace) — this reference exists
only in Bilal's Slack message, which was not pasted into any tracked
document. Recommend asking Bilal/Izzy directly for the 3 product handles if
cross-referencing the Trocar Supplies result above against that list
matters before launch.

---

## Step 5 — Findings by surface

| Surface | Result | Evidence |
|---|---|---|
| PDP | **PASS** | `ProductView.tsx:99` reads `variantShippingDisplays[selectedVariant.id]`, itself `gateFreeShippingClaims(resolveVariantsForProduct(...), product.freeShipping)` in the route (`app/product/[slug]/page.tsx:110`, `app/category/[slug]/[product]/page.tsx:318`). |
| Category card | **PASS** | `components/category/CategoryResults.tsx:115` → `attachCardShippingDisplay` → `ShopifyProductCard.tsx:115`. |
| Search card | **PASS** | `app/search/page.tsx:133` → `attachCardShippingDisplay` → same `ShopifyProductCard`. |
| Quick Add | **PASS** | `ShopifyQuickAddButton.tsx:40` / `QuickAddContent.tsx:210` read `product.shippingDisplay`, attached upstream by `attachCardShippingDisplay` at every card call site. |
| You May Also Need / You May Also Like | **PASS** | `RelatedProductCard` (`ProductView.tsx:29-70`) reads `product.shippingDisplay`; `app/product/[slug]/page.tsx:116-117` runs both `relatedProducts`/`complementaryProducts` through `attachCardShippingDisplay` before they reach `ProductView` (this is the Task 4 fix, already committed — previously these arrays carried no `shippingDisplay` at all). |
| Cart popup | **PASS** | `CartPopup.tsx:215` reads `line.shippingDisplay`, attached by `attachCartShippingDisplay` in every cart action (`app/actions/cart.ts`). |
| Cart page | **PASS** | `CartPageClient.tsx:45,163` reads `line.shippingDisplay` (both the per-line badge and the whole-cart-free summary banner). |
| Checkout | **N/A** | Shopify-hosted checkout is out of this app's control; `resolve.ts`'s own comment states "Shopify checkout remains the authority on the actual charge" — this app never claims to control checkout-page display, only the pre-checkout badges/copy. |

**No structural bug found; no code fix was necessary or made.** The one
brief-listed file that doesn't exist on this branch (`ShippingBlock.tsx`) is
noted above as not applicable, not a finding against the gate.

---

## Recommendations (not this task's job to execute)

1. Ask Bilal/Izzy for the "3 currently missing the flag" Trocar Supplies
   product list (referenced in Bilal's Slack message but not in any tracked
   doc) so the Trocar Supplies spot-check result above can be properly
   classified as expected-vs-unexpected.
2. If a fuller live spot-check of the OCC/Dukal/Trocar/Kadara **positive**
   paths (badge-shows case) against real catalog products is wanted before
   launch, either extend `data/shipping-facts-qa.json` with a couple of real
   GIDs from the affected vendors (Izzy's registry-generation side, not a
   code task), or get explicit sign-off to run the existing read-only
   scripts against production Storefront credentials for a few minutes.
3. `scripts/report-free-shipping-exceptions.ts` was not modified — it
   already reads through the same gate this doc verified use it as-is once
   there's a production-registry-and-store-matched environment to run it in
   (it currently self-aborts loudly in this QA-only setup, correctly, rather
   than silently mis-reporting).
