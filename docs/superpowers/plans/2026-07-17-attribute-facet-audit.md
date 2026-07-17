# Attribute Facet Coverage Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Answer, with live data, whether the Category Architecture ticket's deferred "Phase 3" item — rendering the ~114 attribute collections and ~59 confirmed attribute-patterned `subcategory:` tags as facets — can be wired cheaply today, and wire the parts that can be.

**Architecture:** Two audit scripts (mirroring the existing `scripts/audit-category-tree.ts` / `scripts/audit-collections.ts` pattern — no test files, run against live Shopify data, write a committed Markdown report) were run during planning to ground this plan in real data rather than guesses, since this codebase never hardcodes a hand-authored table without a live, dated confirmation (`BOUNDARY_L1_OVERRIDES`, `PRODUCT_CATEGORY_OVERRIDES`, `ATTRIBUTE_SUBCATEGORY_PATTERNS` all follow this rule). The tag-side script's findings are clean and directly actionable — two L1 categories (Dental, IV Therapy) already have a live, approved metafield covering their attribute tags but no `filterRegistry` entry yet; this plan wires those two. The collection-side script's findings are **not** directly actionable: a purity/size heuristic cannot distinguish a real "attribute value" collection (`25g-hypodermic-needles`) from a real, independently-meaningful product-type collection (`stethoscopes`) — both are small, pure subsets of their parent L1. That distinction needs the same kind of hand-curated, name-pattern approach `ATTRIBUTE_SUBCATEGORY_PATTERNS` already uses for tags, built from the raw candidate list this plan's Task 2 produces — which is real taxonomy work, not cheap, and is explicitly flagged as a separate follow-up rather than built here.

**Tech Stack:** TypeScript, tsx (one-shot script execution against the live Storefront API), Next.js.

## Global Constraints

- **Never expose raw `category:`/`subcategory:` tag facets.** `lib/filter-registry.ts`'s `BLOCKED_TAG_PATTERNS` and `isBlockedFacetId` stay untouched. Every facet this plan wires goes through an already-approved metafield (`APPROVED_METAFIELDS`), the same allowlist discipline every existing `filterRegistry` entry already follows — this plan adds no new metafield definitions to that list, it only adds two new per-collection entries using metafields that already exist there.
- **No hardcoded classification without a live, dated confirmation.** Every value hardcoded by this plan (the two `filterRegistry` entries in Task 3) was confirmed against a live Storefront API pull on 2026-07-17 by this plan's own Task 1 script — matching the standard every other hardcoded table in this codebase already meets.
- **Collection-level attribute classification is out of scope for wiring in this plan.** Task 2's script produces a raw candidate pool (460 collections, most of which are real product-type subcategories, not attribute values) — it is evidence for a follow-up plan's pattern-curation work, not a list to wire facets from directly. Building an accurate `ATTRIBUTE_COLLECTION_PATTERNS`-style denylist from it is real taxonomy work and is flagged, not attempted here, per the ticket's own "not launch-blocking; build now only if cheap, else flag" allowance.
- **Audit scripts have no test file**, matching `scripts/audit-category-tree.ts` and `scripts/audit-collections.ts` — one-shot investigation tools, not product logic.

---

## Task 1: Attribute-subcategory-tag → metafield coverage audit

**Status: script written and run against live Shopify data during planning (2026-07-17); results below are real, not projected.**

**Files:**
- Modify: `lib/shopify/queries/collections.ts` — adds `GET_COLLECTION_FILTERS_ONLY`
- Create: `scripts/audit-attribute-facet-coverage.ts`
- Generates: `audit/attribute-subcategory-facet-coverage-report.md`

**Interfaces:**
- Consumes: `fetchProductTagSummaries` (`@/lib/category-tree-data.server`), `CATEGORY_TREE_L1`, `isAttributeSubcategoryTag`, `resolveCanonicalCategory` (`@/lib/category-tree`), `APPROVED_METAFIELDS` (`@/lib/filter-registry`), `storefrontFetch`

- [x] **Step 1: Add the lean filters-only query**

Already added to `lib/shopify/queries/collections.ts`:

```ts
export const GET_COLLECTION_FILTERS_ONLY = `#graphql
  query GetCollectionFiltersOnly($handle: String!) {
    collection(handle: $handle) {
      handle
      products(first: 1) {
        filters {
          id
          label
          type
          values { id label count input }
        }
      }
    }
  }
`;
```

- [x] **Step 2: Write the audit script**

Already created at `scripts/audit-attribute-facet-coverage.ts`. Full source:

```ts
// Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-attribute-facet-coverage.ts
import { loadEnvConfig } from '@next/env'
import { writeFileSync } from 'fs'
import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_COLLECTION_FILTERS_ONLY } from '../lib/shopify/queries/collections'
import {
  CATEGORY_TREE_L1,
  isAttributeSubcategoryTag,
  resolveCanonicalCategory,
} from '../lib/category-tree'
import { fetchProductTagSummaries } from '../lib/category-tree-data.server'
import { APPROVED_METAFIELDS } from '../lib/filter-registry'

loadEnvConfig(process.cwd())

type CollectionFiltersResponse = {
  collection: {
    products: {
      filters: { id: string; label: string; type: string; values: { id: string; label: string; count: number }[] }[]
    }
  } | null
}

async function main() {
  const summaries = await fetchProductTagSummaries()

  const l1Tags = new Set(CATEGORY_TREE_L1.map((c) => c.tag))
  const subParentCounts = new Map<string, Map<string, number>>()
  for (const summary of summaries) {
    const category = resolveCanonicalCategory(summary)
    if (!category || !l1Tags.has(category)) continue
    for (const sub of summary.subcategories) {
      if (!isAttributeSubcategoryTag(sub)) continue
      let counts = subParentCounts.get(sub)
      if (!counts) {
        counts = new Map()
        subParentCounts.set(sub, counts)
      }
      counts.set(category, (counts.get(category) ?? 0) + 1)
    }
  }

  const parentByTag = new Map<string, string>()
  for (const [sub, counts] of subParentCounts.entries()) {
    const [dominant] = [...counts.entries()].sort((a, b) => b[1] - a[1])
    parentByTag.set(sub, dominant[0])
  }

  const tagsByParent = new Map<string, string[]>()
  for (const [tag, parentTag] of parentByTag.entries()) {
    const list = tagsByParent.get(parentTag) ?? []
    list.push(tag)
    tagsByParent.set(parentTag, list)
  }

  const lines: string[] = []
  lines.push('# Attribute-Subcategory Tag -> Metafield Facet Coverage Audit')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push('')
  lines.push(
    'For each L1 category that has attribute-patterned subcategory: tags today, ' +
      'this lists the tags, their live Storefront collection filters, and whether ' +
      'any filter matches an already-approved metafield (lib/filter-registry.ts) ' +
      'that could represent the attribute -- i.e. "wire now" vs. "needs a new ' +
      'Shopify metafield definition first."',
  )
  lines.push('')

  for (const [parentTag, tags] of [...tagsByParent.entries()].sort()) {
    const l1 = CATEGORY_TREE_L1.find((c) => c.tag === parentTag)
    lines.push(`## ${l1?.displayName ?? parentTag} (\`${parentTag}\`)`)
    lines.push('')
    lines.push(`Attribute tags (${tags.length}): ${tags.sort().map((t) => `\`${t}\``).join(', ')}`)
    lines.push('')

    if (!l1) {
      lines.push('_No approved L1 collection handle for this tag -- cannot check live filters._')
      lines.push('')
      continue
    }

    const data = await storefrontFetch<CollectionFiltersResponse>(GET_COLLECTION_FILTERS_ONLY, {
      handle: l1.collectionHandle,
    })
    const filters = data.collection?.products.filters ?? []

    if (filters.length === 0) {
      lines.push(`_No live filters returned for \`${l1.collectionHandle}\`._`)
      lines.push('')
      continue
    }

    lines.push('| Filter ID | Label | Matches an approved metafield? |')
    lines.push('|---|---|---|')
    for (const filter of filters) {
      const matchedRule = Object.entries(APPROVED_METAFIELDS).find(([, rule]) => rule.matches(filter.id))
      lines.push(
        `| \`${filter.id}\` | ${filter.label} | ${matchedRule ? `YES (\`${matchedRule[0]}\`)` : 'no'} |`,
      )
    }
    lines.push('')
  }

  const report = lines.join('\n') + '\n'
  writeFileSync('audit/attribute-subcategory-facet-coverage-report.md', report)
  console.log(report)
}

main().catch(console.error)
```

- [x] **Step 3: Run the script against live data**

Already run: `NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-attribute-facet-coverage.ts`

**Real results (2026-07-17):**

| L1 category | Attribute tag family | Live metafield coverage | `filterRegistry` entry today |
|---|---|---|---|
| Dental (`dental`) | needle gauge (`23g-/27g-/30g-dental-needles`) | YES — `needle_gauge`, `needle_length`, `size_length_`, `order_size` all live | none (falls to `DEFAULT_FACET_RULES`) |
| IV Therapy (`iv-therapy`) | needle gauge (`24g-iv-catheters`) | YES — same four metafields live | none (falls to `DEFAULT_FACET_RULES`) |
| Mobility (`mobility`) | wheelchair width (`manual-wheelchairs-12..26`) | YES — `size_length_` live | **already present**: `APPROVED_METAFIELDS.size` |
| Needles & Syringes (`needles-syringes`) | gauge/lancet families | YES — `needle_gauge`, `needle_length` live | **already present**: `APPROVED_METAFIELDS.needleGauge`, `.length` |
| Needles & Syringes (`needles-syringes`) | syringe volume (`Xcc-syringe`), sharps volume (`X-gal-sharps`) | NO — no `volume` facet returned live | registered (`APPROVED_METAFIELDS.volume`) but fails closed until Shopify populates the metafield — pre-existing, documented gap, not new |
| Surgical Sutures (`surgical-sutures`) | suture gauge (`0-sutures`..`10-0-sutures`) | NO — no size/gauge-shaped facet returned live (only `material`, which doesn't represent gauge) | none |

**Conclusion:** Dental and IV Therapy are the only two L1 categories with confirmed live metafield coverage and no existing `filterRegistry` entry — Task 3 wires exactly these two. Mobility and Needles & Syringes are already correctly wired for the tag families this script checked. Surgical Sutures' gauge attribute and Needles & Syringes' volume attribute have no live metafield yet — flagged in Task 4's findings doc for the catalog team, not wired here.

- [ ] **Step 4: Commit**

```bash
git add lib/shopify/queries/collections.ts scripts/audit-attribute-facet-coverage.ts audit/attribute-subcategory-facet-coverage-report.md
git commit -m "feat: audit live metafield coverage for attribute-patterned subcategory tags"
```

---

## Task 2: Attribute-collection candidate audit

**Status: script written and run against live Shopify data during planning (2026-07-17); results below are real.**

**Files:**
- Modify: `lib/shopify/queries/collections.ts` — adds `GET_COLLECTIONS_WITH_PRODUCT_SAMPLE`
- Create: `scripts/audit-attribute-collection-candidates.ts`
- Generates: `audit/attribute-collection-candidate-report.md`

**Interfaces:**
- Consumes: `fetchProductTagSummaries`, `CATEGORY_TREE_L1`, `buildL1Tiles`, `resolveCanonicalCategory`, `storefrontFetch`

- [x] **Step 1: Add the collections-with-product-sample query**

Already added to `lib/shopify/queries/collections.ts`:

```ts
export const GET_COLLECTIONS_WITH_PRODUCT_SAMPLE = `#graphql
  query GetCollectionsWithProductSample($first: Int!, $after: String) {
    collections(first: $first, after: $after) {
      nodes {
        handle
        title
        products(first: 50) {
          nodes { handle }
          pageInfo { hasNextPage }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;
```

Outer page size is 50 (not 250) — nesting a 50-product sample per collection raises per-request GraphQL cost well above a flat list, so this stays under Shopify's cost-based throttling.

- [x] **Step 2: Write the audit script**

Already created at `scripts/audit-attribute-collection-candidates.ts`. Full source:

```ts
// Run with:
//   NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-attribute-collection-candidates.ts
import { loadEnvConfig } from '@next/env'
import { writeFileSync } from 'fs'
import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_COLLECTIONS_WITH_PRODUCT_SAMPLE } from '../lib/shopify/queries/collections'
import { CATEGORY_TREE_L1, buildL1Tiles, resolveCanonicalCategory } from '../lib/category-tree'
import { fetchProductTagSummaries } from '../lib/category-tree-data.server'

loadEnvConfig(process.cwd())

const KNOWN_NON_ATTRIBUTE_HANDLES = new Set([
  'frontpage',
  'categories-categories-surgery-procedure-categories-surgery-procedure-instruments-trays',
])

const PURITY_THRESHOLD = 0.8
const MAX_PARENT_SHARE = 0.5

type CollectionsResponse = {
  collections: {
    nodes: {
      handle: string
      title: string
      products: { nodes: { handle: string }[]; pageInfo: { hasNextPage: boolean } }
    }[]
    pageInfo: { hasNextPage: boolean; endCursor: string | null }
  }
}

async function fetchAllCollections(): Promise<CollectionsResponse['collections']['nodes']> {
  const all: CollectionsResponse['collections']['nodes'] = []
  let cursor: string | null = null
  while (true) {
    const data = await storefrontFetch<CollectionsResponse>(GET_COLLECTIONS_WITH_PRODUCT_SAMPLE, {
      first: 50,
      after: cursor,
    })
    all.push(...data.collections.nodes)
    const next = data.collections.pageInfo.endCursor
    if (!data.collections.pageInfo.hasNextPage || !next || next === cursor) break
    cursor = next
  }
  return all
}

async function main() {
  const [summaries, collections] = await Promise.all([fetchProductTagSummaries(), fetchAllCollections()])
  const l1Tiles = buildL1Tiles(summaries)
  const l1ProductCount = new Map(l1Tiles.map((t) => [t.tag, t.productCount]))
  const categoryByHandle = new Map(summaries.map((s) => [s.handle, resolveCanonicalCategory(s)] as const))
  const approvedHandles = new Set(CATEGORY_TREE_L1.map((c) => c.collectionHandle))

  type Candidate = { handle: string; title: string; parentTag: string; purity: number; size: number }
  const candidates: Candidate[] = []
  const unclassified: { handle: string; title: string; sampleSize: string }[] = []

  for (const collection of collections) {
    if (approvedHandles.has(collection.handle)) continue
    if (KNOWN_NON_ATTRIBUTE_HANDLES.has(collection.handle)) continue

    const sampleHandles = collection.products.nodes.map((n) => n.handle)
    if (sampleHandles.length === 0) {
      unclassified.push({ handle: collection.handle, title: collection.title, sampleSize: '0' })
      continue
    }

    const categoryCounts = new Map<string, number>()
    for (const handle of sampleHandles) {
      const category = categoryByHandle.get(handle)
      if (!category) continue
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1)
    }

    const ranked = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])
    const hasNextPage = collection.products.pageInfo.hasNextPage
    const sampleSizeLabel = hasNextPage ? `${sampleHandles.length}+` : `${sampleHandles.length}`

    if (ranked.length === 0) {
      unclassified.push({ handle: collection.handle, title: collection.title, sampleSize: sampleSizeLabel })
      continue
    }

    const [parentTag, matchCount] = ranked[0]
    const purity = matchCount / sampleHandles.length
    const parentTotal = l1ProductCount.get(parentTag) ?? 0
    const sizeKnownExact = !hasNextPage
    const isExactAndSmall = sizeKnownExact && sampleHandles.length <= parentTotal * MAX_PARENT_SHARE

    if (purity >= PURITY_THRESHOLD && isExactAndSmall) {
      candidates.push({ handle: collection.handle, title: collection.title, parentTag, purity, size: sampleHandles.length })
    } else {
      unclassified.push({ handle: collection.handle, title: collection.title, sampleSize: sampleSizeLabel })
    }
  }

  const lines: string[] = []
  lines.push('# Attribute-Collection Candidate Audit')
  lines.push('')
  lines.push(`Generated: ${new Date().toISOString()}`)
  lines.push(`Live collections scanned: ${collections.length}`)
  lines.push(`Already-approved L1 collections excluded: ${approvedHandles.size}`)
  lines.push('')
  lines.push(
    `A candidate is a collection whose exact size is known (<=50 products, no next page), whose ` +
      `sampled products are >=${Math.round(PURITY_THRESHOLD * 100)}% one L1's category: tag, and whose exact size is ` +
      `<=${Math.round(MAX_PARENT_SHARE * 100)}% of that L1's total product count -- i.e. a small, near-pure slice of one ` +
      'approved category, not an independent taxonomy branch. Anything uncertain (size unknown, low ' +
      'purity, or too large relative to its majority parent) goes to Unclassified for human review, ' +
      'never auto-classified as a candidate.',
  )
  lines.push('')

  lines.push(`## Candidates (${candidates.length})`)
  lines.push('')
  lines.push('| Handle | Title | Inferred Parent L1 | Sample Purity | Size |')
  lines.push('|---|---|---|---|---|')
  for (const c of candidates.sort((a, b) => a.parentTag.localeCompare(b.parentTag))) {
    lines.push(`| ${c.handle} | ${c.title} | ${c.parentTag} | ${Math.round(c.purity * 100)}% | ${c.size} |`)
  }

  lines.push('')
  lines.push(`## Unclassified -- needs manual review (${unclassified.length})`)
  lines.push('')
  lines.push(
    'Not an approved L1, not in the known-non-attribute list, and either has no clear majority ' +
      'category: tag, an uncertain (50+) size, or is too large relative to its majority parent to be ' +
      'confidently called an attribute slice -- could be a real subcategory, a not-yet-approved ' +
      'umbrella, a duplicate-title collection, or catalog noise.',
  )
  lines.push('')
  lines.push('| Handle | Title | Sample Size |')
  lines.push('|---|---|---|')
  for (const u of unclassified.sort((a, b) => a.handle.localeCompare(b.handle))) {
    lines.push(`| ${u.handle} | ${u.title} | ${u.sampleSize} |`)
  }

  const report = lines.join('\n') + '\n'
  writeFileSync('audit/attribute-collection-candidate-report.md', report)
  console.log(report)
}

main().catch(console.error)
```

- [x] **Step 3: Run the script against live data**

Already run: `NODE_OPTIONS='--conditions=react-server' npx tsx scripts/audit-attribute-collection-candidates.ts`

**Real results (2026-07-17): 695 live collections scanned, 25 approved L1s excluded, 2 known-non-attribute handles excluded, 460 candidates, 208 unclassified (arithmetic reconciles exactly: 25+2+460+208=695 — includes 152 collections whose 50-product sample came back empty, disclosed as size `0` in Unclassified rather than silently dropped).**

**This result is not directly usable.** 460 of the remaining 668 collections passed the purity+size heuristic — far more than the ticket's "~114" estimate, and manual inspection of the Candidates table shows why: it contains both genuine attribute-value collections (`25g-hypodermic-needles`, `bariatric-wheelchairs-22-seat`, `3cc-syringes`) *and* genuine, independently-meaningful product-type collections (`stethoscopes`, `toothbrushes`, `diagnostic-tools`, `first-responder-bags`) that happen to also be small, pure subsets of their L1 — the heuristic cannot tell these apart, because both shapes look statistically identical from collection-membership data alone. The "Unclassified" collections are informative for a different reason: `beds` (confirms the ticket's "Beds under Room Furniture" item is about a real, large collection, not an attribute), `first-responder-bags-category` alongside `first-responder-bags` in Candidates (confirms the ticket's own flagged duplicate-title-collection TBD), `4-0-sutures` (a *tag-named* collection separate from the `surgical-sutures` L1 — worth a follow-up look, out of scope here), and the 152 zero-sample collections (empty or misconfigured collections — worth a separate housekeeping pass, out of scope here).

The report **is** valuable as raw material: a name-pattern approach (the same technique `ATTRIBUTE_SUBCATEGORY_PATTERNS` already uses for tags) applied to the 460 candidate handles would very likely separate the true attribute slices (numeric+unit-suffixed handles: `-\d+g-`, `-\d+cc-`, `-\d+-seat`, `astm-level-\d+-`, etc. — all visibly present in the Candidates table) from the real subcategories (plain-word handles). Building and validating that pattern list against the full candidate set, with the same "false negatives OK, false positives not OK" discipline, is real work — Task 4 flags it as a named follow-up rather than guessing at a pattern list here.

- [ ] **Step 4: Commit**

```bash
git add lib/shopify/queries/collections.ts scripts/audit-attribute-collection-candidates.ts audit/attribute-collection-candidate-report.md
git commit -m "feat: audit live collections for attribute-slice candidates outside the L1 registry"
```

---

## Task 3: Wire the two confirmed-ready `filterRegistry` entries

**Files:**
- Modify: `lib/filter-registry.ts`
- Test: `lib/__tests__/filter-registry.test.ts` (existing file — confirm its exact name and current test structure with `ls lib/__tests__/filter-registry*` before writing new tests, and follow its existing `describe`/`it` conventions)

**Interfaces:**
- Consumes: `APPROVED_METAFIELDS`, `VENDOR`, `PRICE`, `AVAILABILITY` (module-private in `lib/filter-registry.ts`, used directly since Step 3 edits that same file), `getAllowedFacets`, `HOSTILE_FACETS` (existing test fixture, `lib/__tests__/filter-registry.test.ts`)
- Produces: two new `filterRegistry` keys, `dental` and `'iv-therapy'`

- [ ] **Step 1: Write the failing tests**

`lib/__tests__/filter-registry.test.ts` already has a shared `HOSTILE_FACETS` fixture (top of the file) covering every approved metafield id, including `filter.p.m.custom.needle_gauge`, `filter.p.m.custom.needle_length`, `filter.p.m.custom.size_length_`, and `filter.p.m.custom.order_size` — exactly the four this task wires. It also has an `EVERY_COLLECTION` loop (`[...Object.keys(filterRegistry), 'some-unlisted-collection']`, around line 61) that automatically runs the "never renders a blocked source" and "every rendered facet matches an allowed rule" guard tests (lines 63-99) for every key in `filterRegistry` — adding `dental` and `'iv-therapy'` as keys in Step 3 means those two guard tests already cover them for free, no new code needed there.

Add two new tests in the `describe('page-specific facet sets', ...)` block (around line 102), in the same style as the existing `'Mobility shows weight + size'` test right above where you're inserting:

```ts
it('Dental shows needle gauge + length + size + order size', () => {
  const ids = getAllowedFacets('dental', HOSTILE_FACETS).map((f) => f.id)
  expect(ids).toEqual(
    expect.arrayContaining([
      'filter.p.m.custom.needle_gauge',
      'filter.p.m.custom.needle_length',
      'filter.p.m.custom.size_length_',
      'filter.p.m.custom.order_size',
    ]),
  )
  expect(ids).not.toContain('filter.p.m.custom.glove_size')
})

it('IV Therapy shows needle gauge + length + size + order size', () => {
  const ids = getAllowedFacets('iv-therapy', HOSTILE_FACETS).map((f) => f.id)
  expect(ids).toEqual(
    expect.arrayContaining([
      'filter.p.m.custom.needle_gauge',
      'filter.p.m.custom.needle_length',
      'filter.p.m.custom.size_length_',
      'filter.p.m.custom.order_size',
    ]),
  )
  expect(ids).not.toContain('filter.p.m.custom.glove_size')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/filter-registry.test.ts`
Expected: FAIL — `dental` and `iv-therapy` are not yet keys in `filterRegistry`, so `getFacetRules` returns `DEFAULT_FACET_RULES` (`[AVAILABILITY, PRICE, VENDOR]` only), missing the metafield assertions.

- [ ] **Step 3: Write the implementation**

In `lib/filter-registry.ts`, add two new entries to `filterRegistry` (after the existing `mobility` entry, before the closing `}`):

```ts
  // Confirmed live 2026-07-17 (docs/superpowers/plans/2026-07-17-attribute-
  // facet-audit.md, Task 1): needle_gauge/needle_length/size_length_/
  // order_size are all live, populated Storefront metafields on this
  // collection today -- same shape as needles-syringes below, since dental
  // needle products carry the same gauge/length/size attributes.
  dental: [
    APPROVED_METAFIELDS.needleGauge,
    APPROVED_METAFIELDS.length,
    APPROVED_METAFIELDS.size,
    APPROVED_METAFIELDS.orderSize,
    VENDOR,
    PRICE,
    AVAILABILITY,
  ],

  // Confirmed live 2026-07-17 (same audit as dental above) -- IV catheter
  // gauge is the attribute in question (24g-iv-catheters etc.), same
  // metafield family.
  'iv-therapy': [
    APPROVED_METAFIELDS.needleGauge,
    APPROVED_METAFIELDS.length,
    APPROVED_METAFIELDS.size,
    APPROVED_METAFIELDS.orderSize,
    VENDOR,
    PRICE,
    AVAILABILITY,
  ],
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/filter-registry.test.ts`
Expected: PASS (all tests, including the 2 new ones).

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, visit `/category/dental` and `/category/iv-therapy`. Confirm the filter rail now shows Needle Gauge, Needle Length, Size, and Order Size options (previously only Vendor/Price/Availability were shown, per `DEFAULT_FACET_RULES`) — and confirm no raw tag values (e.g. `category:dental` or any `23g-dental-needles`-style string) ever appear as a filter label or value. Stop the dev server when done.

- [ ] **Step 6: Commit**

```bash
git add lib/filter-registry.ts lib/__tests__/filter-registry.test.ts
git commit -m "feat: wire Dental and IV Therapy to their confirmed-live needle-gauge metafield facets"
```

---

## Task 4: Findings doc + QA checklist update

**Files:**
- Create: `docs/superpowers/specs/2026-07-17-attribute-facets-audit-findings.md`
- Modify: `docs/category-tree-qa-checklist.md`

- [ ] **Step 1: Write the findings doc**

Create `docs/superpowers/specs/2026-07-17-attribute-facets-audit-findings.md`:

```markdown
# Attribute Facets — Audit Findings

Live-data findings from `docs/superpowers/plans/2026-07-17-attribute-facet-audit.md`,
run 2026-07-17 against the live Storefront API.

## Wired in this plan (Task 3)

- **Dental** (`dental`) and **IV Therapy** (`iv-therapy`) — both had a fully live,
  populated needle-gauge metafield family (`needle_gauge`, `needle_length`,
  `size_length_`, `order_size`) with no existing `filterRegistry` entry. Wired to
  the same shape as the existing `needles-syringes` entry.

## Already correctly wired, no action needed

- **Mobility** (`mobility`) — wheelchair-width attribute tags already covered by
  the existing `APPROVED_METAFIELDS.size` entry.
- **Needles & Syringes** (`needles-syringes`) — gauge/lancet attribute tags already
  covered by the existing `needleGauge`/`length` entries.

## Flagged — needs a new Shopify metafield definition first (not built here)

- **Surgical Sutures** (`surgical-sutures`) — suture-gauge tags (`0-sutures`
  through `10-0-sutures`) have no live size/gauge-shaped metafield today (only
  `material`, which doesn't represent gauge). Needs a new Storefront-filterable
  metafield definition (mirroring how `needle_gauge` was set up) before this can
  be wired.
- **Needles & Syringes volume family** (`Xcc-syringe`, `X-gal-sharps` tags) — the
  `APPROVED_METAFIELDS.volume` rule is already registered in code but the
  `volume` metafield isn't yet populated/filterable live on this collection
  (pre-existing gap, documented in `lib/filter-registry.ts`'s own comments — not
  something this audit found new).

## Attribute-collection classification — inconclusive, needs a follow-up plan

`audit/attribute-collection-candidate-report.md`'s purity/size heuristic cannot
distinguish a real attribute-value collection (`25g-hypodermic-needles`) from a
real, independently-meaningful product-type collection (`stethoscopes`) — both
score identically as "small, pure subsets of an L1." 460 of 695 live collections
passed the heuristic, far more than usable. The report's raw data does show a
promising signal: attribute-shaped handles are visibly name-patterned (`-\d+g-`,
`-\d+cc-`, `-\d+-seat`, `astm-level-\d+-`, etc.) the same way `subcategory:` tags
already were before `ATTRIBUTE_SUBCATEGORY_PATTERNS` was built. A follow-up plan
should build and validate an equivalent name-pattern denylist against this
report's 460 candidates (same "false negatives OK, false positives not OK" bar),
not attempt to wire facets from the raw candidate list directly.

## Recommendation

Ship Task 3's two wired categories now — they're free, confirmed-live wins. Open
a follow-up ticket for the catalog team on the two flagged metafield gaps
(Surgical Sutures gauge, Needles & Syringes volume). Scope the collection-side
pattern-curation work as its own plan when there's appetite for it — it's real
taxonomy work, not a quick follow-on to this audit.
```

- [ ] **Step 2: Update the QA checklist's Phase 3 row**

In `docs/category-tree-qa-checklist.md`, replace the `⏸ "Render the ~114 attribute collections + 80 attribute subcategory: values as facets."` section (currently around line 89) with:

```markdown
### ⏸/✅ "Render the ~114 attribute collections + 80 attribute subcategory: values as facets."

**Tag-side: partially done.** `docs/superpowers/plans/2026-07-17-attribute-facet-audit.md`
wired Dental and IV Therapy's needle-gauge attribute tags to live metafields
(`lib/filter-registry.ts`). Mobility and Needles & Syringes' gauge families were
already wired. Surgical Sutures' gauge and Needles & Syringes' volume family are
flagged for a new Shopify metafield — see
`docs/superpowers/specs/2026-07-17-attribute-facets-audit-findings.md`.

**Collection-side: still ⏸, not started.** The ~114 attribute collections need a
name-pattern classification pass (see the findings doc's last section) before any
wiring — not attempted yet.

Today's baseline behavior (already correct and pre-existing, not something this
ticket broke): `lib/filter-registry.ts`'s `BLOCKED_TAG_PATTERNS` already
hard-blocks raw `category:`/`subcategory:` tag facets everywhere. Confirm that
guard is still intact:
```bash
grep -n "BLOCKED_TAG_PATTERNS" -A 12 lib/filter-registry.ts
```
```

Also update the acceptance-criteria table row `| Attribute collections + 80 attribute subcats render as facets only | ⏸ Phase 3 | N/A yet |` to `| Attribute collections + 80 attribute subcats render as facets only | ⏸/✅ Phase 3 partial (Dental+IV Therapy wired, rest flagged) | See findings doc |`.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-07-17-attribute-facets-audit-findings.md docs/category-tree-qa-checklist.md
git commit -m "docs: synthesize attribute-facet audit findings and update QA checklist"
```

---

## Task 5: Full verification pass

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: matches the current baseline exactly (same pre-existing, unrelated failures already documented in `.superpowers/sdd/progress.md`) plus the 2 new passing tests from Task 3 — no new failures.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (the pre-existing, unrelated `ProductView.a11y.test.tsx` error may still appear).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: succeeds, no new errors.

- [ ] **Step 4: Confirm the blast radius matches the plan**

Run: `git diff --stat <BASE>..HEAD`
Expected: only `lib/shopify/queries/collections.ts`, two new `scripts/`, two new `audit/*.md` reports, `lib/filter-registry.ts`, `lib/__tests__/filter-registry.test.ts`, and the two docs files from Task 4 — nothing in `lib/category-tree.ts`, `app/`, or `components/` changed, matching this plan's scope.
