// Pure detection logic for scripts/audit-variant-candidates.ts.
//
// Built directly off the 2026-09-15 Bilal → izzy Slack postmortem: the Aug
// consolidation grouped products by stripping a SIZE word from the title,
// but its recognized size list only covered short forms (XL, X-Large, XXL,
// 2XL, 3XL) — Shield Line writes "Extra Large" / "Extra Extra Large" in
// full, so those titles never reduced to the same base as the short-form
// siblings and were left standing as their own products. The fix was a
// bigger size-synonym table, applied consistently across every vendor's
// title conventions. This module is that bigger table, kept separate and
// unit-tested (lib/catalog/__tests__/variant-candidates.test.ts) so the same
// gap can't reopen quietly.
//
// This is a CANDIDATE detector, not a merge tool: like the precedent
// audit/attribute-collection-candidate-report.md, everything it finds is
// for human review before anyone touches Shopify — never auto-merged.

export type CatalogProductSummary = {
  handle: string
  title: string
  vendor: string
  tags: string[]
}

export type SizeCanon = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL'

// Deliberately NO bare single-letter forms ("s" / "m" / "l"): free-text
// titles and handles are full of short unrelated tokens (SKU fragments,
// pack-code letters), and a bare-letter match is too easy to false-positive
// on. Abbreviations that are still reasonably unambiguous (sm/med/lg) and
// every spelled-out form (short AND long, including the exact "Extra Large"
// / "Extra Extra Large" forms the postmortem named) are covered.
type SizeForm = { canon: SizeCanon; form: string }

const SIZE_FORMS_RAW: SizeForm[] = [
  { canon: 'XXXL', form: 'extra extra extra large' },
  { canon: 'XXXL', form: 'xxx large' },
  { canon: 'XXXL', form: 'xxxlarge' },
  { canon: 'XXXL', form: '3x large' },
  { canon: 'XXXL', form: '3xlarge' },
  { canon: 'XXXL', form: '3xl' },
  { canon: 'XXXL', form: 'xxxl' },

  { canon: 'XXL', form: 'extra extra large' },
  { canon: 'XXL', form: 'xx large' },
  { canon: 'XXL', form: 'xxlarge' },
  { canon: 'XXL', form: '2x large' },
  { canon: 'XXL', form: '2xlarge' },
  { canon: 'XXL', form: '2xl' },
  { canon: 'XXL', form: 'xxl' },

  { canon: 'XL', form: 'extra large' },
  { canon: 'XL', form: 'x large' },
  { canon: 'XL', form: 'xlarge' },
  { canon: 'XL', form: 'xl' },

  { canon: 'L', form: 'large' },
  { canon: 'L', form: 'lg' },

  { canon: 'M', form: 'medium' },
  { canon: 'M', form: 'med' },

  { canon: 'S', form: 'small' },
  { canon: 'S', form: 'sm' },

  { canon: 'XS', form: 'extra small' },
  { canon: 'XS', form: 'x small' },
  { canon: 'XS', form: 'xsmall' },
  { canon: 'XS', form: 'xs' },
]

// Longest form first: at any given starting position a longer, more
// specific phrase (e.g. "extra extra large") must be tried before a shorter
// one that could otherwise consume just part of it.
const SIZE_FORMS: SizeForm[] = [...SIZE_FORMS_RAW].sort((a, b) => b.form.length - a.form.length)

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeForSizeMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type SizeMatch = { canon: SizeCanon; form: string }

/** First (longest-form-wins) size token found in `text`, or null. */
export function findSizeToken(text: string): SizeMatch | null {
  const normalized = normalizeForSizeMatch(text)
  for (const { canon, form } of SIZE_FORMS) {
    if (new RegExp(`\\b${escapeRegex(form)}\\b`).test(normalized)) return { canon, form }
  }
  return null
}

/** `text` with one occurrence of `form` removed, whitespace collapsed. */
export function stripSizePhrase(text: string, form: string): string {
  const normalized = normalizeForSizeMatch(text)
  return normalized.replace(new RegExp(`\\b${escapeRegex(form)}\\b`), ' ').replace(/\s+/g, ' ').trim()
}

export type ResolvedProductSize = {
  canon: SizeCanon
  /** Grouping key candidate: the title with its size phrase removed. */
  base: string
  /** Where the size token was found. 'handle' means the TITLE itself never
      states a size (seen live: Graham Field's finger-cots-ltx-lg-... titles
      omit the size word entirely while the Med/XL siblings state theirs) —
      flagged separately in the report rather than silently trusted, since a
      title with no size word at all is a data-quality issue in its own
      right, independent of whether the products should merge. */
  source: 'title' | 'handle'
}

export function resolveProductSize(p: CatalogProductSummary): ResolvedProductSize | null {
  const fromTitle = findSizeToken(p.title)
  if (fromTitle) return { canon: fromTitle.canon, base: stripSizePhrase(p.title, fromTitle.form), source: 'title' }

  const fromHandle = findSizeToken(p.handle)
  if (fromHandle) return { canon: fromHandle.canon, base: normalizeForSizeMatch(p.title), source: 'handle' }

  return null
}

export type VariantCandidateGroup = {
  vendor: string
  baseTitle: string
  members: { handle: string; title: string; size: SizeCanon; sizeSource: 'title' | 'handle' }[]
}

/**
 * Groups products by (vendor, title-with-size-stripped) and returns every
 * group with 2+ members carrying 2+ DISTINCT sizes — i.e. products that
 * look like they are separate standalone listings for what should be one
 * product's size variants. A group with the same size repeated twice is a
 * possible duplicate-listing question, not this bug class, so it is not
 * flagged here.
 */
export function findVariantMergeCandidates(products: CatalogProductSummary[]): VariantCandidateGroup[] {
  const groups = new Map<string, VariantCandidateGroup>()

  for (const p of products) {
    const resolved = resolveProductSize(p)
    if (!resolved) continue
    const key = `${p.vendor.trim().toLowerCase()}::${resolved.base}`
    let group = groups.get(key)
    if (!group) {
      group = { vendor: p.vendor, baseTitle: resolved.base, members: [] }
      groups.set(key, group)
    }
    group.members.push({ handle: p.handle, title: p.title, size: resolved.canon, sizeSource: resolved.source })
  }

  return [...groups.values()].filter(
    (g) => g.members.length >= 2 && new Set(g.members.map((m) => m.size)).size >= 2,
  )
}

export type MattressCoverEntry = {
  handle: string
  title: string
  tags: string[]
  taggedFingerCots: boolean
}

const FINGER_COTS_SUBCATEGORY_TAG = 'subcategory:finger-cots'

/**
 * Every product whose title mentions "mattress cover", regardless of its
 * tags — Bilal's report was that these show up "in the finger cots sub
 * category", which is surprising on its face (lib/category-tree.ts's
 * PRODUCT_CATEGORY_OVERRIDES comment records mattress covers as a
 * room-furniture/housekeeping question, not gloves/finger-cots), so this is
 * a mis-tagging/mis-placement check, not the size-merge check above:
 * `taggedFingerCots` tells a reviewer at a glance whether the product
 * actually carries the finger-cots subcategory tag (a real tagging bug) or
 * whether it doesn't (meaning the sighting has some other cause — nav,
 * search, or a stale page — worth chasing separately).
 */
export function findMattressCoverEntries(products: CatalogProductSummary[]): MattressCoverEntry[] {
  return products
    .filter((p) => p.title.toLowerCase().includes('mattress cover'))
    .map((p) => ({
      handle: p.handle,
      title: p.title,
      tags: p.tags,
      taggedFingerCots: p.tags.includes(FINGER_COTS_SUBCATEGORY_TAG),
    }))
}
