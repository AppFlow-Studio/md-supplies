# Catalog / CRO Remediation — AUTHORITATIVE FINAL REPORT

**Supersedes every prior report in this folder**, including `remediation-report.md`
and both earlier revisions of this file.

## 0. SHAs — and why the previous two reports got this wrong

| | |
|---|---|
| Base | **`8ce74a5`** |
| Head *before* this report commit | **`b9a8493`** |
| Branch tip | **the commit that adds this file** — print it with `git rev-parse HEAD` |
| Commits on the branch | 25 (base → `b9a8493`), plus this one |
| Diff, `8ce74a5..b9a8493` | **126 files, +6,570 / −871** |
| Diff, `feec780..b9a8493` (this session) | **51 files, +2,513 / −142** |
| Draft PR | **[#1](https://github.com/BilalA99/md-supplies/pull/1)** — OPEN, draft, `fix/catalog-cro-remediation-2026-08-02` → `main` on `BilalA99/md-supplies` |

`remediation-report.md` claimed the head was `88fa5aa`. The previous revision of
this file claimed `703095f`, then `056ceec`. All three were wrong for the same
structural reason: **a report cannot name the SHA of the commit that contains
it.** Writing the tip SHA into the file guarantees it is stale the instant it is
committed. This revision therefore does not state its own tip — it states the
head it was written against and tells you how to print the real one.

**Correction:** the previous revision said "Not pushed. No PR." The *no-PR* half
was false. Draft PR #1 already exists and currently points at `feec780`. It must
be **updated**, not replaced — do not open a second PR.

Still true: nothing merged, nothing marked ready for review, **no Shopify
writes**.

## 1. Commits

Base → `b9a8493`. The last ten are this session's.

| SHA | Scope |
|---|---|
| `aada15b` | July-7 baseline reproduced; RX detection widened to `custom.is_rx_only` |
| `54b897f` | PR #55 vendor hard-deny ported; vendor-as-brand render leak closed |
| `7241bf7` | Logo served locally; CDN auth diagnostics; empty heroes collapse |
| `6c32a98` | Category results update in place (twin route + rewrite removed) |
| `9271460` | SubcategoryNavigator, discovery toolbar, denser headers |
| `057d33f` | OCC copy constant; zero-price items blocked from checkout |
| `88fa5aa` | OCC restructured as a category page; Shopify-native label path |
| `51cbd21` | (prior report — superseded) |
| `fecbd7f` | RX account/document gate restored as the default |
| `f9430f4` | Industry pages gated on validated assortment |
| `c4dd360` | Toolbar hierarchy, collapsed filters, card-footer quick-add |
| `34f0705` | Label detection + dry-run assignment tooling |
| `e8a8cea` | Supported industries rebuilt as full landing pages |
| `703095f` | No-document-reload e2e proof |
| `feec780` | (prior report revision — superseded) |
| `a0c3955` | Vendor filter-INPUT leak closed; RX detection narrowing fixed |
| `1de17f2` | Phase 8 industry metaobject architecture + dry-run tooling |
| `4bf8047` | Phase 13 responsive sweep, 7 viewports |
| `056ceec` | Three WCAG AA contrast failures fixed; axe state coverage |
| `ce47fc0` | (prior report revision — superseded by this file) |
| `9dec72f` | Bulk migration evidence moved out of git |
| `914a9b0` | **CSP nonce defect fixed** without weakening the policy |
| `f5753a4` | Semantic ink tokens; measured contrast audit; regression suite |
| `6a9a26b` | Dependency audit isolated in CI; 3 advisories fixed; rest documented |
| `b9a8493` | Read-only inventory + location audit; correction package |

## 2. Review weight

The PR was unreviewable: **80,970 of 82,008 added lines were three generated
files** (`industry-rollback.json` 58,962 · `industry-affected-products.csv`
14,639 · `industry-current-to-proposed.csv` 7,369). They are byte-reproducible
from `scripts/industries-mapping-dryrun.mjs` plus the dated export, so git now
carries the **checksums**, not the rows.

Committed: `industry-summary.md`, `industry-unmapped.csv`,
`industry-rollback.schema.json` (the rollback package's shape), and
`industry-evidence-checksums.txt` (sha256 + line counts). Bulk output goes to a
gitignored `evidence/` directory.

Net: **175 insertions in place of 80,987.** Session diff is now 2,513 lines.

## 3. Defects found by NOT trusting the prior report

### 3.1 Vendor leak through the filter INPUT path
`filter.p.vendor` was denied as a **facet** — the prior report checked exactly
that and declared vendor absent. But `INPUT_VALIDATORS` still accepted a
`productVendor` key, so `?filter={"productVendor":"MedPlus"}` was accepted on
`/category/[slug]` and `/search` and forwarded to Shopify: it filtered the
catalogue by internal **fulfilling vendor**, rendered a chip, and minted
indexable faceted URLs keyed on fulfiller names. Facet-deny and input-deny are
two gates; one was open. **Two existing tests asserted the leak was allowed.**

### 3.2 RX detection silently NARROWED on grid cards
The quick-add hand-rolled a tag-only check, `resolveRxLabel` was tag-only, and
`queries/collections.ts` never selected the metafield — so the union could not
be evaluated on any grid, and the **40 ACTIVE metafield-only RX products** this
audit itself found carried no RX indicator. **Checkout gating was never
affected** (the cart query was already correct): a display narrowing, not a gate
bypass.

### 3.3 `FilterRail.tsx` was BINARY to git
A raw NUL byte meant every FilterRail change on this branch was invisible to
diff review and excluded from line statistics — directly undermining this
report's own obligation. Pre-existing at `8ce74a5`.

### 3.4 CSP nonce defect — **root-caused and fixed**
`/blog` and `/blog/[handle]` each emitted exactly one script tag with no nonce.
Under `strict-dynamic` the `'self'` source is ignored, so a nonce-less
same-origin script is blocked outright — that block *was* the console error.

Isolation: the chunk exported `FadeIn`, `WholesalePricing`, `FACILITY_TYPES`,
`submitForm`. The first two are used on `/about`, `/faq`, `/partners` — all
clean — so neither was the cause. The differentiator was that blog's
`loading.tsx` rendered `<WholesalePricing />` **inside the Suspense fallback**:
a client component pulling a server action, whose chunk preload Next emitted
without the nonce. The other two routes with a `loading.tsx` import only
`Skeleton`, and are clean.

It was also wrong on its own terms — a loading fallback shipped a fully
interactive lead-capture form that a shopper could start filling in seconds
before it was destroyed.

Fixed with `WholesalePricingSkeleton` (same footprint, no client component, no
layout shift), plus aligning `proxy.ts` with Next's CSP guide so the nonce'd
policy is set on the **request** headers too — a byte-identical string that
widens nothing.

**Not done:** no `unsafe-inline`, no `unsafe-eval`, `strict-dynamic` untouched,
`object-src 'none'` intact. `e2e/csp.spec.ts` asserts all of that so the
shortcut fixes cannot land silently.

**Result: 0 nonce-less scripts on all 10 routes; the blog route now PASSES; zero
CSP violations anywhere in the 121-test Playwright run.**

## 4. A false finding of mine, corrected

The previous revision claimed `text-teal-500` measures **2.42:1** and is a
systemic failure across **116 usages**. **That was wrong.** I computed it from
the stock Tailwind v4 palette without reading this project's theme.
`globals.css` already overrides it:

```
--color-teal-500: #006d92;  /* 5.83:1 on white */
```

The brand colour was deliberately made AA-compliant before I arrived. Acting on
my claim would have meant repainting an already-correct colour across 116 sites.
**The systemic contrast problem does not exist.**

What replaced the guess: `scripts/audit-text-contrast.mjs` measures rendered
colour against the effective background. Two of its own bugs produced confident
nonsense before it was trustworthy — the theme is authored in **oklch**, and
regex-scraping `oklch(1 0 0)` reads white as `rgb(1,0,0)` (6 phantom 1.17:1
failures); and treating any ancestor of an `<svg>` as an icon flagged every
`<section>` at 1:1. Colours are now resolved by painting a canvas pixel.

**1,094 text nodes across 13 routes; zero requiring correction.**

Genuine defects fixed: the **error page**'s "Support code" (2.49:1 — a page
shoppers do see), `/about` copy on dark panels (3.87:1), breadcrumb dividers
(1.41:1), account nav icons (2.60:1), plus the earlier "Out of Stock" (3.81:1)
and contact links (3.51:1). Semantic `--color-ink-*` tokens now carry these
roles, with **measured** ratios (my first pass wrote estimates; three were
wrong, including a separator I called 3.4:1 that was 2.81:1).

## 5. Inventory & location audit (read-only, production)

Replaces the supplied CSV, which had a header row and **zero data rows**.
7,385 active products · 10,293 variants · 308 API calls · no writes.

**Headline: 1 of 10,293 variants has inventory tracking enabled.** Tracking is
effectively off store-wide, so Shopify does not enforce `inventoryPolicy` — the
`DENY` on these variants stops nothing today.

**624 inventory levels are NEGATIVE** (mostly −1 to −4, tail past −17). Below
zero is not a real stock level. The distribution points at import residue, which
is the specific reason this audit **does not approve another consolidation
import**.

The two interact, and the **sequence** is the finding: while tracking is off the
negatives are latent; switch tracking on before reconciling and 624 variants
become unbuyable that minute.

Clean otherwise: 10 locations, all active and fulfilling online orders; no
stranded stock, no ledger mismatches. Note these "locations" are **shipping
tiers and vendors** (Dukal, MedPlus, "MDSupplies Free Shipping", "Minimum Order
$700"), not warehouses — "fulfils online orders" does not mean what it usually
means here.

## 6. CI structure

`npm audit --audit-level=high` was a **step inside** the main job, ahead of Build
and the secret scan — so when it went red on a transitive advisory it took both
down, and the checks that gate a release stopped reporting. It is now its own
`dependency-audit` job that nothing depends on.

CI always reports: **lint · typecheck · unit · build · secret scan · launch
guardrails · Playwright E2E · dependency audit.**

**Correcting my earlier "no fix available":** that came from the human-readable
output, which prints it per package even when `fixAvailable` in the JSON names a
parent upgrade. `npm audit fix` (non-forced) cleared **undici** (5 advisories),
**brace-expansion** (2) and **@next/third-parties**: 4 high + 1 moderate → **3
high**. The remaining three (`next`, `postcss`, `sharp`) all clear via
`next` 16.2.12 → **16.3.0**, a semver-**minor** bump — deliberately not bundled
here, because a framework upgrade would make it impossible to tell a remediation
regression from an upgrade regression. Documented with exposure arguments and
exit conditions in `docs/security/dependency-risk-exceptions.md`;
`scripts/audit-with-exceptions.mjs` fails on anything **not** on that list, so
the audit stays meaningful rather than permanently red.

## 7. Final local gate — exact exit codes

| Gate | Exit | Result |
|---|---:|---|
| `npm ci` | 0 | reproducible (base `8ce74a5` lockfile: **exit 1, not installable**) |
| `npx tsc --noEmit` | 0 | |
| `npx eslint . --max-warnings 0` | 0 | |
| `npm test` | 0 | **1,148 passed / 120 files** |
| `npm run build` | 0 | |
| `scripts/audit-with-exceptions.mjs` | 0 | 3 documented, 0 unreviewed |
| `npm audit --audit-level=high` | 1 | expected — the 3 documented advisories |
| `npx playwright test` | 1 | **108 passed, 12 failed, 1 skipped** — all 12 are QA-store data gaps (§8) |
| Secret scan | 1 (clean) | |
| Tracked `.env` scan | 1 (clean) | |
| Focused/skipped/todo scan | 1 (clean) | |

Targeted suites: vendor input + facet leak **122** · RX union + label safety
**57** · zero-price **15** · sitemap/canonical/noindex **143** · CSP **12/12** ·
axe states **8/8** · contrast **10 passed, 1 skipped** · responsive sweep
**56/56** (8 routes × 7 viewports, no horizontal overflow, exactly one h1).

## 8. Blocked — with the precise reason

### 8.1 QA fixtures, RX walkthrough, category/industry E2E
**Blocked on Shopify access scopes, not on authorization.** Probing the QA
Admin API on 2026-08-03:

- the `atkn_` token → **401 Unauthorized** outright;
- the `shpat_` token authenticates to the correct QA shop but grants only
  `shop` and `metafieldDefinitions`. **DENIED:** `products`, `productsCount`,
  `collections`, `locations`, `publications`, `metaobjectDefinitions`,
  `inventoryItems`, `currentAppInstallation`.

So the mandated **pre-write snapshot cannot be taken** (no `read_products` /
`read_inventory` / `read_locations`), and fixtures cannot be created
(`write_products` is not granted where `read_products` is denied).

**Needed on the QA custom app:** `read_products`, `write_products`,
`read_inventory`, `write_inventory`, `read_locations`, `read_publications`,
`write_publications`, and `read/write_metaobjects` if metaobject fixtures are
wanted.

`scripts/qa-fixtures-export.mjs` is written and **dual-gated** — it refuses
unless the env names the QA shop *and* Shopify independently confirms the token
authenticates to it — and runs the moment scopes are granted.

The QA store today holds 18 fixtures and one collection (`frontpage`), and
**contains no RX-flagged product at all**, so nothing can trigger the gate even
with scopes. RX behaviour meanwhile has 57 passing unit/regression assertions.

### 8.2 The 12 Playwright failures
All are the same cause: the QA store has no `gloves`, no `testing-screening`, no
industry collections, and no `nitrile-exam-gloves-powder-free`. Failure modes
are Server Components render errors, "element(s) not found", and grid timeouts.
**No CSP violations, no contrast failures, no axe violations among them.**

### 8.3 Not verified
Hosted CI (nothing pushed). Live-vs-July-7 industry comparison. OCC count
reconciliation. Partial-shipment fixture. Fordeer vendor response. Phase 8's
Storefront fragment is written against the documented schema and is
**unverified** — no definitions exist to verify against.

## 9. Shopify change package (each separate and reversible)

1. **Grant QA Admin scopes** (§8.1) — unblocks fixtures, RX walkthrough, E2E.
2. Add an **RX fixture** to the QA store so the gate is testable without touching production.
3. Rotate the **BunnyCDN storage AccessKey** (every request 401s).
4. Reconcile **RX tag vs `custom.is_rx_only`** (40 active products).
5. Decide the **inventory tracking question**, then reconcile the **624 negative balances** — in that order.
6. Confirm the canonical **OCC collection** GID/count and the gifts/toys handle.
7. Create the **product-label metaobject** definition.
8. Create the **`custom.product_labels`** metafield.
9. Apply **product-label assignments** (dry-run ready; rollback emitted).
10. Create the **`industry` + `faq_entry` metaobjects**.
11. Create the **`custom.industries`** metafield.
12. Create **automated industry collections**.
13. Apply **industry assignments** (dry-run ready; rollback schema + checksums committed).
14. Review **3,166 duplicate SKUs** and **41 zero-price active variants**.

Do not combine these.

## 10. Remaining decisions

**Client:** unconditional OCC free-shipping wording; evidence for suppressed
claims; RX compliance package; whether to create a real veterinary assortment;
the inventory-tracking decision (§5).

**Bilal/product:** whether Veterinary should 404 or stay a noindexed route;
whether the hidden header/account stat bars stay hidden; whether to rename `ems`
→ `ems-first-responders`; **whether to take `next@16.3.0` as its own PR** (§6).

## 11. Rollback

`git checkout main`, or reset to `backup/pre-clean-fix-completion-2026-07-30`.
No migrations, no backfills, no Shopify writes. `RX_CHECKOUT_ENFORCEMENT=false`
is the RX kill switch.

Regenerable artifacts (gitignored): screenshots via
`npx playwright test e2e/responsive.spec.ts`; industry evidence via
`node scripts/industries-mapping-dryrun.mjs <catalog.csv>` (verify against the
committed checksums); inventory evidence via
`node scripts/audit-inventory-locations.mjs`.

## 12. Production safety

No Shopify Admin writes — the inventory audit's `admin()` structurally refuses
any query containing `mutation`. No Fordeer changes. No rate, profile, location,
publication or Markets changes. The production shop guard was **not** relaxed;
QA credentials were used instead and `.env.local` was restored to its original
contents afterwards (QA config preserved separately as the gitignored
`.env.qa.local`). No deployment, nothing merged, no secrets committed.

## 13. Launch recommendation

**Not release-ready**, and the blocker is evidence, not known defects.

Ready: the vendor leak, RX narrowing, CSP defect and contrast failures are fixed
and pinned by regression suites; the local gate is green except for documented
data gaps; the PR is reviewable again.

Blocking: **no product-dependent verification has been performed anywhere.** The
category/industry grids, the no-reload guarantee and the RX account/document
walkthrough are the highest-risk surfaces in this change and none has been
exercised against a shop with real data — first because the shop guard correctly
blocked production, then because the QA store lacks both the scopes and the
fixtures. Hosted CI, which connects to a shop with real data, is the fastest way
to close most of that gap.

Recommended order: push and update Draft PR #1 → read hosted CI → grant QA
scopes and add an RX fixture → complete the RX walkthrough and grid E2E →
re-assess.
