# Catalog / CRO Remediation — AUTHORITATIVE FINAL REPORT

**This supersedes every prior report in this folder**, including
`remediation-report.md` (whose commit table stopped at `88fa5aa` because it was
written inside the commit that created it).

Branch `fix/catalog-cro-remediation-2026-08-02`
Base **`8ce74a5`** → Head **`703095f`** · 90 files, **+4,006 / −815**
**Not pushed. No PR. Nothing merged. No Shopify writes.**

## 1. Commits

| SHA | Scope |
|---|---|
| `aada15b` | Catalog baseline reproduced; RX detection widened to `custom.is_rx_only` |
| `54b897f` | PR #55 vendor hard-deny ported; vendor-as-brand leak closed |
| `7241bf7` | Logo served locally; CDN auth diagnostics; empty heroes collapse |
| `6c32a98` | Category results update in place (twin route + rewrite removed) |
| `9271460` | SubcategoryNavigator, discovery toolbar, denser headers |
| `057d33f` | OCC copy constant; zero-price items blocked from checkout |
| `88fa5aa` | OCC restructured as a category page; Shopify-native label path |
| `51cbd21` | (prior report — superseded by this file) |
| `fecbd7f` | **RX account/document gate restored as the default** |
| `f9430f4` | Industry pages gated on validated assortment |
| `c4dd360` | Toolbar hierarchy, collapsed filters, card-footer quick-add |
| `34f0705` | Label detection + dry-run assignment tooling |
| `e8a8cea` | Supported industries rebuilt as full landing pages |
| `703095f` | No-document-reload e2e proof |

## 2. RX compliance — restored, verified

The previous remediation shipped the gate **disabled by default**. That was
wrong: it silently removed an existing compliance control. Restored, with all
ten required confirmations evidenced in
[`rx-compliance-verification.md`](rx-compliance-verification.md).

Key evidence: `origin/main` gated unconditionally; `71e1b65` (which never
existed on `origin/main`) introduced default-off; the exemption block diffs
byte-identical apart from the added `isRxOnly` input; and
`git diff --name-only` over the seven RX flow files (`RxCheckoutGate`,
`rx-storage`, `rx-scan`, the account route, the account card, `actions/rx.ts`,
`shopify/admin.ts`) is **empty** — nothing in the flow was touched.

`isRxEnforcementEnabled()` now returns true unless the env var is **exactly**
`"false"`. 14 regression tests pin it.

**Scope, not overclaimed:** this is the storefront UX gate. The bypass-resistant
control is the companion Shopify validation app, untouched.

## 3. Catalog & industry findings

All 12 known catalog values and all 6 industry counts reproduce **exactly**
(clinic 6,390 · urgent-care 4,344 · home-care 3,091 · hrt-surgery 531 ·
pharmacy 282 · occ-charities 106 — overlapping, historical, July 7).

- **RX mismatch:** metafield true on 501, tag on 461 — 40 ACTIVE prescription
  products the tag alone missed. Detection now unions both.
- **3,166 duplicate SKUs** spanning >1 product ⇒ SKU is never an identity.
- **Only 5 of 12 requested industry pages have any products.** Full matrix in
  [`industry-matrix.md`](industry-matrix.md).
- **Veterinary: zero products.** Delisted, noindexed, no products invented.

**SEO defect fixed:** the sitemap emitted all twelve industry URLs while seven
served `noindex`.

## 4. Verification (local)

| Gate | Result |
|---|---|
| `npm test` | **1144 passed / 120 files** |
| `npx tsc --noEmit` | pass |
| `npx eslint --max-warnings 0` | pass, exit 0 |
| `npm run build` | pass, exit 0 |
| `npm ci` | reproducible |
| Secret scan (3 CI patterns) | clean |
| `npm audit` | 4 high + 1 moderate — **identical on the baseline lockfile**, zero introduced; all transitive via `next` |
| **Playwright — no-reload** | **5/5 passed**, zero document navigations |
| **Playwright — axe** | **9/9 passed**, no serious/critical violations |
| Playwright — routes/smoke | 8/9 passed (see §6) |

Live route checks: `/category/testing-screening` renders **55 crawlable
subcategory links**; `/industries/urgent-care` renders scoped search, a real
result count, 29 category links and its own buying guide;
`/industries/veterinary` serves `noindex,follow`; `/category/occ` **301s** to
`/solutions/occ`.

## 5. Shopify change package (each item separate and reversible)

1. Rotate the **BunnyCDN storage AccessKey** (every request returns 401).
2. Reconcile **RX tag vs `custom.is_rx_only`** (40 active products).
3. Confirm the **canonical OCC collection** GID/count and the intended
   gifts/toys handle.
4. Create the **product-label metaobject** definition.
5. Create the **`custom.product_labels`** product metafield.
6. Apply **product-label assignments** (dry-run tooling ready; rollback emitted).
7. Create the **industry metaobject + `custom.industries` metafield**.
8. Create **automated industry collections**.
9. Review **3,166 duplicate SKUs** and **41 zero-price active variants**.

## 6. NOT verified — stated plainly

- **Hosted CI:** nothing pushed, so no hosted run exists.
- **`/blog/types-of-needles` console error** — one routes.spec assertion fails
  on a console error. I attempted a baseline comparison to establish whether it
  pre-exists; that experiment corrupted the working tree and was rolled back
  (recovered clean at `e8a8cea`, all three stashes intact). **Whether this
  pre-exists on the base is unverified.** It is unrelated to any file changed
  here — no blog file was modified.
- **Viewport screenshot sweep (375→1920):** not captured. Browser screenshot
  capture failed earlier in the session ("Browser pane is not displayed").
- **Real-browser RX walkthrough** (signed-out → account → upload → unblocked).
- **Industry metaobject architecture (Phase 8):** specified in the matrix but
  the dry-run mapping tooling for industries was not built.
- Live-vs-July-7 industry comparison; OCC count reconciliation; partial-shipment
  fixture; Fordeer vendor response.

## 7. Remaining decisions

**Client:** unconditional OCC free-shipping wording; evidence for suppressed
claims; RX compliance package; whether to create a real veterinary assortment.

**Bilal/product:** whether Veterinary should 404 or stay a noindexed route;
whether the hidden header/account stat bars stay hidden; whether to rename
`ems` → `ems-first-responders` (deferred — renaming an unsupported URL creates
a redirect for a page with no assortment).

## 8. Rollback

`git checkout main`, or reset to `backup/pre-clean-fix-completion-2026-07-30`.
No migrations, no data backfills, no Shopify writes. New flags default safe;
`RX_CHECKOUT_ENFORCEMENT=false` is the RX kill switch.

## 9. Production safety

No Shopify Admin writes. No Fordeer changes. No rate/profile/location/Markets
changes. All Shopify access read-only (Storefront catalog + Admin *reads* of
metafield/metaobject definitions). No deployment. Nothing merged.
