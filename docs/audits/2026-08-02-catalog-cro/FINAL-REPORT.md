# Catalog / CRO Remediation — AUTHORITATIVE FINAL REPORT

**This supersedes every prior report in this folder**, including
`remediation-report.md` (commit table stopped at `88fa5aa`) and the previous
revision of this file (head `703095f`).

Branch `fix/catalog-cro-remediation-2026-08-02`
Base **`8ce74a5`** → Head **`056ceec`** · 107 files, **+85,912 / −836**
(insertions are dominated by ~4 MB of generated Phase 8 evidence CSV/JSON;
source changes are ~4,400 lines.)

**Not pushed. No PR. Nothing merged. No Shopify writes.**

## 0. Repository state (Phase 0) — discrepancy resolved

| Question | Answer |
|---|---|
| Authoritative head | `056ceec` (was `feec780` at session start) |
| Are `88fa5aa` / `51cbd21` the head? | **No** — both are ancestors. Neither was ever a tip. |
| What `51cbd21` changed | One file: `remediation-report.md` (+144). Docs only. |
| Why the old table ended at `88fa5aa` | It was written *inside* `51cbd21`, so it could not list itself or anything after. |
| Working tree | Clean apart from pre-existing untracked evidence dirs. |
| Stashes | **All 3 intact** (verified at start and end). No `reset --hard`, no `clean`. |
| Work outside the reported commits | None. |

## 1. Commits

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
| `feec780` | (prior report revision — superseded by this file) |
| **`a0c3955`** | **Vendor filter-INPUT leak closed; RX detection narrowing fixed** |
| **`1de17f2`** | **Phase 8 industry metaobject architecture + dry-run tooling** |
| **`4bf8047`** | **Phase 13 responsive sweep across all 7 viewports** |
| **`056ceec`** | **Three WCAG AA contrast failures fixed; axe state coverage** |

The last four are this session's work: independent re-verification rather than
acceptance of the prior report, plus closing the gaps it declared.

## 2. Defects found by NOT trusting the prior report

The prior report claimed Phases 1–5 complete. Four real defects survived it.

### 2.1 Vendor leak through the filter INPUT path (Phase 1)

`filter.p.vendor` was hard-denied as a **facet**, so the rail never rendered a
Vendor group — and the prior report checked exactly that and declared vendor
absent. But `INPUT_VALIDATORS` still accepted a `productVendor` key, so
`?filter={"productVendor":"MedPlus"}` was accepted on `/category/[slug]` and
`/search` and forwarded to the Storefront API. That filtered the catalogue by
internal **fulfilling vendor**, rendered a chip, and minted indexable faceted
URLs keyed on fulfiller names.

Facet-deny and input-deny are two independent gates; only one was closed. Two
existing tests **asserted the leak was allowed**, pinning the bug in place.
Both inverted; a regression test now pins the deny in both directions.
Partner pages are unaffected — they pass `vendor:"…"` as a Storefront `query`
string, which never reaches this validator.

### 2.2 RX detection silently NARROWED on grid cards (Phase 5)

The mandate requires the tag ∪ `custom.is_rx_only` union to never narrow. It
narrowed in three places at once:

- `ShopifyQuickAddButton` hand-rolled a tag-only check;
- `resolveRxLabel` keyed on tags alone;
- `queries/collections.ts` **did not select the metafield at all**, so the
  union could not be evaluated on any category or industry grid.

Net effect: the **40 ACTIVE metafield-only RX products** this very audit
identified carried no RX indicator on any grid. Detection now lives only in the
shared helpers, and the collection query selects the metafield.

**Checkout gating was never affected** — the cart query already selected the
metafield — so this was a display narrowing, not a gate bypass. Stated as such
rather than inflated.

### 2.3 `FilterRail.tsx` was a BINARY file to git

It contained a raw NUL byte (a literal separator in `activeFilters.join(…)`).
Git therefore treated it as binary: **every FilterRail change on this branch
was invisible to diff review and excluded from all line statistics** — which
directly undermines this report's own Phase 15 obligation. Replaced with the
semantically identical printable escape (backslash-u-0000), so the file diffs
as text again. Pre-existing at `8ce74a5`, not introduced here.

### 2.4 Three WCAG AA contrast failures (Phase 13)

| Element | Before | After |
|---|---|---|
| "Out of Stock" (`text-red-500`, 13px) | 3.81:1 | red-700 **6.42:1** |
| Contact / header links (`text-teal-600`) | 3.51:1 | teal-700 **5.13:1** |

AA requires 4.5:1. On a storefront whose stated audience includes older
individual customers, this is not cosmetic.

## 3. RX compliance — preserved and verified

Unchanged from the prior report and re-verified: the account/document gate is
the default, `isRxEnforcementEnabled()` returns true unless the env var is
exactly `"false"`, and `git diff --name-only 8ce74a5..HEAD` over the seven RX
flow files is **empty** — nothing in the flow was touched. §2.2 above widens
detection; it does not alter the gate.

**Scope, not overclaimed:** this is the storefront UX gate. The
bypass-resistant control is the companion Shopify validation app, untouched.

## 4. Catalog & industry findings (Phase 7) — independently reproduced

Re-derived from `catalog-full-2026-07-07.csv` this session, not copied forward.
All six counts reproduce **exactly** (10,326 unique products; 7,368 carry an
industry tag):

| Industry tag | Active products |
|---|---:|
| `industry:clinic` | 6,390 |
| `industry:urgent-care` | 4,344 |
| `industry:home-care` | 3,091 |
| `industry:hrt-surgery` | 531 |
| `industry:pharmacy` | 282 |
| `industry:occ-charities` | 106 |

Counts **overlap**; these are **historical July-7** figures and do not prove
current live membership. Only six dedicated industry values exist. SKU is not a
unique key (3,166 SKUs span >1 product).

**Filename note:** the mandate names `catalog-full-2026-07-07(2).csv`; the file
used was `catalog-full-2026-07-07.csv`. Confirmed to be the same export by
exact reproduction of all six counts.

**Veterinary: zero products.** Delisted, `noindex`, no products invented.

## 5. Phase 8 — industry architecture (was NOT built; now built)

`docs/industry-architecture.md` specifies the `industry` metaobject (+
`faq_entry`), the `custom.industries` product metafield, and one automated
collection per approved industry — with the metaobject owning page CONTENT and
the collection owning PRODUCTS, so industry pages inherit the shared discovery
system rather than a hand-picked six. Fail-closed rules and an explicitly
UNVERIFIED Storefront fragment are included.

`scripts/industries-mapping-dryrun.mjs` is read-only and makes **no Shopify
calls at all**. Outputs: current-to-proposed, affected products, rollback,
unmapped tags, summary. `industry:occ-charities` is deliberately not migrated.
The seven unbacked industries get **no invented products**.

## 6. Verification — exact results

| Gate | Result |
|---|---|
| `npm test` | **1,148 passed / 120 files**, exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `npx eslint . --max-warnings 0` | exit 0 |
| `npm run build` | exit 0 |
| `npm ci --dry-run` (branch) | exit 0 — **reproducible** |
| `npm ci` (base `8ce74a5`) | **exit 1 — base lockfile is NOT reproducible** |
| `npm audit --audit-level=high` | 5 (1 moderate, 4 high) — all `sharp`→libvips, **no fix available**, none introduced here |
| Secret scan | clean |
| Focused/skipped test scan | clean |
| Playwright — responsive sweep | **56/56** (8 routes × 7 viewports) |
| Playwright — axe states | **8/8** |
| Playwright — routes | 4 passed / 4 failed (**all 4 pre-exist on base**, §7) |
| Playwright — no-reload | **blocked**, §7 |

The base-lockfile finding is new: this branch's `package-lock.json` change
repaired a lockfile that `npm ci` could not install at all.

## 7. Environment blocker, and what it invalidates

`lib/shopify/shop-guard.ts` correctly refuses to let a QA build reach the
production store. `.env.local` carried production credentials, so every product
grid rendered a Server Components error. **This is the guard working as
designed, not a defect** — and it is the reason the prior report's
"no-reload 5/5" and "axe 9/9" claims **are not reproducible**.

QA-store credentials were supplied mid-session and used for all product-level
verification. The QA store carries **18 fixtures and one collection
(`frontpage`)**, so:

**Verified against QA:** zero-price PDP renders "Contact for pricing" with no
Add-to-Cart and disabled controls; out-of-stock and backorder states; cart;
account; contact; axe across all of them.

**Still blocked:**
- **Category/industry grids, filters, the no-reload suite** — the QA store has
  no `gloves`, `testing-screening` or industry collections to render.
- **Real-browser RX walkthrough** — more precisely characterised than before:
  the QA store contains **no RX-flagged product** (no `compliance:rx-only` tag,
  no `custom.is_rx_only`). Creating one would be a **Shopify write**, which is
  not authorized. RX behaviour remains covered by 14+ unit/regression tests.

**Baseline comparison (this session, via a git worktree at `8ce74a5` — no
`reset --hard`, no `clean`, all stashes preserved):**

| Suite | Base `8ce74a5` | Branch |
|---|---|---|
| routes.spec | 5 failed / 3 passed | **4 failed / 4 passed** |

`/blog/types-of-needles` fails **identically on base** — a CSP `strict-dynamic`
nonce violation on a Next.js chunk. **The prior report's open question is now
answered: it pre-exists and was not introduced here.** `home`, `category` and
`pdp` also pre-exist. The branch **fixed** `occ` and introduced **zero** new
failures.

## 8. Findings requiring a decision (not silently actioned)

1. **`text-teal-500` measures 2.42:1 on white** and is used **116 times**,
   including the product-card brand line — real text, worse than either
   contrast failure fixed here. NOT bulk-changed: repainting the brand colour
   across 116 sites is a design/client decision, not a remediation side effect.
   It did not trip axe this session only because QA fixtures carry no
   `custom.brand_name`; against the production catalogue (3,790 active products
   with a brand name) it would flag on essentially every card.
2. **Pre-existing CSP nonce defect** blocking a Next.js chunk under
   `strict-dynamic` (§7). Unrelated to this remediation; needs its own fix.
3. **`sharp`/libvips high-severity advisories** with no fix available.
4. **`partnerVendor`** is declared in `types/product.ts` and read in
   `ProductInfo.tsx` but **never assigned anywhere** — dead code. Left in
   place; removing it is out of scope.

## 9. Shopify change package (each item separate and reversible)

1. Rotate the **BunnyCDN storage AccessKey** (every request returns 401).
2. Reconcile **RX tag vs `custom.is_rx_only`** (40 active products).
3. Confirm the **canonical OCC collection** GID/count and the gifts/toys handle.
4. Create the **product-label metaobject** definition.
5. Create the **`custom.product_labels`** product metafield.
6. Apply **product-label assignments** (dry-run ready; rollback emitted).
7. Create the **`industry` + `faq_entry` metaobjects**.
8. Create the **`custom.industries`** product metafield.
9. Create **automated industry collections**.
10. Apply **industry assignments** (dry-run ready; rollback emitted).
11. Review **3,166 duplicate SKUs** and **41 zero-price active variants**.
12. Consider adding an **RX fixture to the QA store** so the RX gate becomes
    end-to-end testable without touching production.

Do not combine these into one operation.

## 10. Still NOT verified — stated plainly

- **Hosted CI** — nothing pushed, so no hosted run exists.
- **Category/industry grid QA and the no-reload suite** — §7.
- **Real-browser RX walkthrough** — §7; blocked by the absence of an RX fixture
  and the no-writes rule.
- Live-vs-July-7 industry comparison; OCC count reconciliation; partial-shipment
  fixture; Fordeer vendor response.
- Phase 8's Storefront fragment is written against the documented schema and is
  **unverified** — no definitions exist to verify it against.

## 11. Remaining decisions

**Client:** unconditional OCC free-shipping wording; evidence for suppressed
claims; RX compliance package; whether to create a real veterinary assortment;
the brand-colour contrast decision (§8.1).

**Bilal/product:** whether Veterinary should 404 or stay a noindexed route;
whether the hidden header/account stat bars stay hidden; whether to rename
`ems` → `ems-first-responders` (deferred — renaming an unsupported URL creates
a redirect for a page with no assortment).

## 12. Rollback

`git checkout main`, or reset to `backup/pre-clean-fix-completion-2026-07-30`.
No migrations, no data backfills, no Shopify writes. New flags default safe;
`RX_CHECKOUT_ENFORCEMENT=false` is the RX kill switch.

Screenshots are gitignored (14 MB regenerable). Regenerate with:
`E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/responsive.spec.ts`
→ `docs/audits/2026-08-02-catalog-cro/screenshots/`

## 13. Production safety

No Shopify Admin writes. No Fordeer changes. No rate/profile/location/Markets
changes. All Shopify access read-only. The production shop guard was **not**
relaxed — QA credentials were used instead, and `.env.local` was restored to its
original production contents (QA config preserved separately as `.env.qa.local`,
gitignored). No deployment. Nothing merged. No secrets committed.
