# Priority #11 — Industry Pages, Blog Articles, Reviews Research

**Date:** 2026-06-17
**Source:** Closeout doc §11 (MDSupplies Custom Website Developer Closeout Document)
**Branch:** munis

---

## Scope

Three work streams to close the gaps identified in §11:

1. Industry pages — FAQ copy, two new industry entries, OCC broader charity wording
2. Blog static content — `types-of-needles` and `types-of-sutures` articles via static map
3. Reviews research — research-only doc, no implementation

---

## Work Stream 1 — Industry Pages

### 1.1 Goal

Six industry pages per §11.1 spec, each with visible FAQs and FAQ schema. The template (`IndustryPage`, `FAQSection`) is already built. The gap is: `lib/industries.ts` has no `faq` field, and two of the six target industries don't exist yet.

### 1.2 Files changed

| File | Change |
|---|---|
| `lib/industries.ts` | Add `faq?: { question: string; answer: string }[]` to `Industry` type. Add 2 new entries. Add FAQ copy to 5 existing entries (the 3 existing + 2 new; OCC is separate). |
| `app/industries/[industry-slug]/page.tsx` | Thread `faq: industryStatic.faq` into the `Industry` object passed to `<IndustryPage>`. One line added. |
| `lib/occ.ts` | Update `intro`, `programExplanation`, `faq`, `seoTitle`, `seoDescription` to cover broader charity use cases. |

### 1.3 The six target pages

| Spec name | Source | Slug | Collection handle |
|---|---|---|---|
| Clinics & Doctor's Offices | NEW entry | `clinics-doctors-offices` | `clinics-doctors-offices` |
| Urgent Care Centers | existing `urgent-care` | `urgent-care` | `urgent-care` |
| Pharmacies | NEW entry | `pharmacies` | `pharmacies` |
| Home Care / In-Home Nursing | existing `home-health` | `home-health` | `home-health` |
| HRT Clinics / Surgery & Procedure | existing `hrt-clinics` | `hrt-clinics` | `hrt-clinics` |
| OCC / Charities | `lib/occ.ts` + `/solutions/occ` | n/a | n/a |

The other 7 existing industries in `lib/industries.ts` (EMS, Long-Term Care, Physical Therapy, Private Practice, Dental, Veterinary, Community Health) are not renamed or removed. Home Health is one of the 6 targets and receives FAQ copy.

Collection handles for the two new entries must exist in Shopify. If the collection is empty or missing, the page renders gracefully (product/subcategory modules show empty — `Promise.allSettled` already handles this).

### 1.4 FAQ copy rules (per §11.1)

- Answer buyer-intent questions (ordering, quantities, eligibility, category guidance)
- Support SEO/GEO intent
- No unsupported shipping promises ("same-day", "2–3 day")
- No medical claims or compliance claims
- No fake urgency or savings claims
- 4–6 FAQs per page
- FAQ schema emitted automatically by `FAQSection` (already wired)

### 1.5 OCC / Charities wording

`lib/occ.ts` copy must cover broader charity use cases beyond Operation Christmas Child:
- Food banks and community pantries
- Disaster relief and emergency response orgs
- Faith-based health ministries
- Free clinics and nonprofit health centers
- Community health drives and school/youth programs

`seoTitle` → `Charity & Nonprofit Medical Supply Program — MDSupplies`
`seoDescription` → updated to reflect broader mission

---

## Work Stream 2 — Blog Static Content Map

### 2.1 Goal

Deliver "Types of Needles" and "Types of Sutures" as articles that render immediately in the existing blog template without requiring Shopify admin access. Content lives in git.

### 2.2 Approach

Static-first, Shopify-fallback. The blog detail page already handles Shopify content; we add a thin local check before the Shopify fetch.

### 2.3 Files changed

| File | Change |
|---|---|
| `lib/blog-static.ts` | New file. Exports `STATIC_ARTICLES: Record<string, StaticArticle>` with two entries. |
| `app/blog/[handle]/page.tsx` | `findArticle()` checks `STATIC_ARTICLES[handle]` first; if found, returns it shaped as `{ blogHandle: 'static', article: ... }`. `generateStaticParams` injects static handles. `generateMetadata` gets same static-first check. |

### 2.4 StaticArticle shape

```ts
interface StaticArticle {
  id: string
  handle: string
  title: string
  excerpt: string
  contentHtml: string       // full HTML article body
  publishedAt: string       // ISO date string
  author: { name: string }
  tags: string[]
  image?: { url: string; altText: string }
}
```

This matches the `BlogArticle` shape the blog page already uses, so rendering is zero-change.

### 2.5 Articles

**`types-of-needles`** — "Types of Needles Used in Medical Settings: A Complete Guide"
- ~700 words, educational
- Covers: gauge sizes, bevel types, needle lengths, use cases (IM, SQ, IV, blood draw)
- Internal links: `/category/needles-syringes`, relevant product handles
- Tags: `Needles`, `Clinical Guide`

**`types-of-sutures`** — "Types of Sutures: Absorbable, Non-Absorbable, and When to Use Each"
- ~700 words, educational
- Covers: absorbable vs non-absorbable, monofilament vs braided, common suture materials, wound closure decisions
- Internal links: `/category/wound-care`, `/category/surgical-sutures`
- Tags: `Sutures`, `Wound Care`, `Clinical Guide`

Both articles use BunnyCDN placeholder images (`/mdsupplies/blog/`) if no image URL is confirmed. Fallback: `/images/pills_on_hands.png` (already in codebase).

---

## Work Stream 3 — Reviews Research

### 3.1 Goal

Deliver a research doc answering every question from §11.3. No implementation.

### 3.2 File

`docs/reviews-research.md`

### 3.3 Questions answered

1. Can existing Trust Reviews data be exported and migrated?
2. Can Google Shopping / Product Ratings be used or surfaced?
3. Can manufacturer/vendor reviews be used with permission?
4. Can Amazon or marketplace reviews legally be embedded, referenced, or summarized?
5. What are the risks (copyright, platform TOS, fake-review policy, schema eligibility)?
6. Can review schema be used only for MDSupplies-owned verified reviews?

### 3.4 Recommendation format

Clear pick with rationale. Options evaluated:
- Keep Trust Reviews app + migrate existing reviews
- Build Resend post-purchase review-request email flow
- Defer external review aggregation until post-launch
- Use manufacturer/vendor reviews with written permission

---

## Constraints (global, per §1.5)

- No unsupported medical claims anywhere in FAQ copy or article content
- No fake review stars, fake ratings, or fake urgency in any content authored here
- No same-day / 2–3 day delivery promises
- No staging/localhost canonical URLs
- FAQ schema only where visible FAQ content exists (already enforced by `FAQSection`)

---

## Out of scope

- Renaming or removing existing industry entries outside the 6 spec targets
- Adding FAQs to the other 8 existing industries (EMS, Long-Term Care, etc.)
- Implementing review collection or review schema
- Any Shopify admin work (collection creation, product tagging)
- BunnyCDN image upload (hero image URLs in new industry entries use BunnyCDN paths; actual upload is Shopify/ops team)
