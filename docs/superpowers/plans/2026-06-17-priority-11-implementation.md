# Priority #11 — Industry Pages, Blog Articles, Reviews Research — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the §11 gaps: FAQ copy on 6 industry pages, two new industry entries, broader OCC/charity wording, two static blog articles, and a reviews research doc.

**Architecture:** Industry FAQs live in `lib/industries.ts` (static data) and are threaded one line into the industry page. Blog articles use a static-first map in `lib/blog-static.ts`; the blog detail page checks it before fetching Shopify. OCC wording is updated directly in `lib/occ.ts`.

**Tech Stack:** Next.js (App Router), TypeScript, Shopify Storefront API, existing `FAQSection` + `IndustryPage` components.

## Global Constraints

- No unsupported shipping promises (no "same-day", "2–3 day delivery")
- No medical or compliance claims in FAQ copy or article content
- No fake urgency, fake savings, or fake review content
- FAQ schema emitted only where visible FAQ content exists (`FAQSection` already enforces this)
- No staging/localhost canonical URLs
- Follow `§1.5` rules from closeout doc verbatim

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/industries.ts` | Modify | Add `faq` field to type; add 2 new entries; add FAQ copy to 5 entries |
| `app/industries/[industry-slug]/page.tsx` | Modify | Thread `faq` from static data into `Industry` object (1 line) |
| `lib/occ.ts` | Modify | Update intro, programExplanation, faq, seoTitle, seoDescription for broader charity scope |
| `lib/blog-static.ts` | Create | Export `STATIC_ARTICLES: Record<string, BlogArticle>` with 2 articles |
| `app/blog/[handle]/page.tsx` | Modify | Static-first check in `findArticle`, `generateStaticParams`, `generateMetadata` |
| `docs/reviews-research.md` | Create | Research-only doc answering all §11.3 questions |

---

## Task 1: Extend `lib/industries.ts` — faq type + 5 entries + 2 new entries

**Files:**
- Modify: `lib/industries.ts`

**Interfaces:**
- Produces: `Industry` type with `faq?: { question: string; answer: string }[]`; `INDUSTRIES` array with 12 entries (10 existing + 2 new), 5 of which have `faq` populated

- [ ] **Step 1: Add `faq` field to the `Industry` type**

Replace the existing type block at the top of `lib/industries.ts`:

```ts
export type FAQ = {
  question: string
  answer: string
}

export type Industry = {
  name: string
  slug: string
  collectionHandle: string
  description: string
  image: string
  buyerType: string
  faq?: FAQ[]
}
```

- [ ] **Step 2: Add FAQ copy to the `urgent-care` entry**

Find the `urgent-care` object in `INDUSTRIES` and add the `faq` field:

```ts
{
  name: 'Urgent Care',
  slug: 'urgent-care',
  collectionHandle: 'urgent-care',
  description: 'Exam gloves, wound care, diagnostics, and testing supplies.',
  image: 'https://www.figma.com/api/mcp/asset/945dd7c5-715c-47e9-aca9-041bfa7e8af7',
  buyerType: 'Urgent care center owners, clinic managers, and medical directors sourcing high-turnover consumables for walk-in patient care.',
  faq: [
    {
      question: 'What are the most commonly ordered supplies for urgent care centers?',
      answer: 'Urgent care centers typically order high volumes of exam gloves, wound care dressings, rapid diagnostic test kits, IV supplies, and disposable exam room consumables. MDSupplies carries all of these categories with bulk ordering options.',
    },
    {
      question: 'Can urgent care centers order in bulk to reduce per-unit cost?',
      answer: 'Yes. MDSupplies offers volume-based pricing for facilities that order regularly. Contact our B2B team to discuss account setup and volume pricing tiers for your center.',
    },
    {
      question: 'Do you carry point-of-care testing and rapid diagnostic supplies?',
      answer: 'We carry testing supplies including rapid test kits, urine dipsticks, and specimen collection materials. Browse our diagnostics and testing category to see current availability.',
    },
    {
      question: 'How do I set up a recurring supply order for my urgent care center?',
      answer: 'Contact our B2B team to discuss account management options. We can help you establish preferred ordering quantities and streamline reordering so your facility stays stocked without manual intervention each cycle.',
    },
    {
      question: 'Are wound care and laceration supplies available for urgent care use?',
      answer: 'Yes. We carry sutures, wound closure strips, irrigation supplies, and dressing materials appropriate for urgent care laceration management. Browse the wound care category for available options.',
    },
  ],
},
```

- [ ] **Step 3: Add FAQ copy to the `home-health` entry**

Find the `home-health` object and add:

```ts
{
  name: 'Home Health',
  slug: 'home-health',
  collectionHandle: 'home-health',
  description: 'Incontinence, wound care, and daily living aids.',
  image: 'https://www.figma.com/api/mcp/asset/0f2a3758-05f9-43c4-8d28-6638add9f893',
  buyerType: 'Home health agency owners, visiting nurse supervisors, and care coordinators ordering supplies for patient homes and caregiver kits.',
  faq: [
    {
      question: 'What supplies do home health agencies typically need to order?',
      answer: 'Home health agencies commonly order wound care dressings, incontinence products, gloves, personal care items, and mobility aids. MDSupplies carries all of these in quantities suitable for agency-level purchasing.',
    },
    {
      question: 'Can I order supplies on behalf of multiple patients from one account?',
      answer: 'Yes. Our B2B account structure supports agency-level purchasing where one account manager can place and track orders across multiple patient assignments. Contact our team to set up your account.',
    },
    {
      question: 'Do you offer bulk pricing for home health agencies?',
      answer: 'We offer volume-based pricing for agencies that order regularly. Reach out to our B2B team to discuss pricing tiers based on your anticipated order volume.',
    },
    {
      question: 'Are incontinence and personal care products available in case quantities?',
      answer: 'Yes. Incontinence briefs, underpads, and personal care wipes are available in case quantities appropriate for agency purchasing. Browse the incontinence and personal care categories for current options.',
    },
    {
      question: 'What is the best way to manage supply orders for a distributed care team?',
      answer: 'Contact our B2B team to discuss account management options. We can help you organize ordering by care team or territory so your coordinators can track and replenish supplies efficiently.',
    },
  ],
},
```

- [ ] **Step 4: Add FAQ copy to the `hrt-clinics` entry**

Find the `hrt-clinics` object and add:

```ts
{
  name: 'HRT Clinics',
  slug: 'hrt-clinics',
  collectionHandle: 'hrt-clinics',
  description: 'Trocar kits, syringes, needles, and specialized hormone supplies.',
  image: 'https://www.figma.com/api/mcp/asset/cca76797-f0a7-43e5-a222-aaa09b5ee04b',
  buyerType: 'Hormone replacement therapy clinic operators and nurse practitioners managing ongoing pellet insertion and injection protocols.',
  faq: [
    {
      question: 'Do you carry trocar kits and pellet insertion supplies for HRT clinics?',
      answer: 'Yes. We carry trocar kits, needles, syringes, and related supplies used in hormone pellet insertion procedures. Browse the HRT Clinics category to see available options.',
    },
    {
      question: 'What needle and syringe options are available for hormone injection protocols?',
      answer: 'We carry a range of needle gauges and lengths suitable for intramuscular and subcutaneous hormone injections, as well as sterile syringes in the volumes commonly used for HRT protocols. Browse needles and syringes for available sizes.',
    },
    {
      question: 'Can I order procedure supplies in the quantities needed for a high-volume HRT practice?',
      answer: 'Yes. We offer bulk and case-quantity ordering for clinics that perform procedures regularly. Contact our B2B team to discuss volume pricing options for your practice.',
    },
    {
      question: 'Are your supplies appropriate for in-office procedure rooms?',
      answer: 'Our products are sourced from established medical supply manufacturers and are intended for use in licensed clinical settings. Review each product listing for manufacturer specifications and intended use.',
    },
    {
      question: 'How do I find supplies specific to my procedure type?',
      answer: 'Browse the HRT Clinics category on MDSupplies or use the search bar to look up specific product types such as trocars, pellet insertion kits, or injection needles. Contact our team if you need help sourcing a specific item.',
    },
  ],
},
```

- [ ] **Step 5: Add the new `clinics-doctors-offices` entry**

Append this new entry to the `INDUSTRIES` array:

```ts
{
  name: 'Clinics & Doctor\'s Offices',
  slug: 'clinics-doctors-offices',
  collectionHandle: 'clinics-doctors-offices',
  description: 'Exam room essentials, diagnostic supplies, gloves, and office consumables for outpatient practices.',
  image: '',
  buyerType: 'Clinic owners, office managers, and medical directors sourcing exam room consumables, diagnostic supplies, and day-to-day clinical materials for outpatient practices.',
  faq: [
    {
      question: 'What types of medical supplies do clinics and doctor\'s offices typically order?',
      answer: 'Clinics and physician offices typically order exam gloves, exam table paper, diagnostic supplies, wound care materials, specimen collection items, and general consumables. MDSupplies carries all of these categories with ordering options suited to practice-level volumes.',
    },
    {
      question: 'Can I set up a standing order or recurring supply arrangement for my practice?',
      answer: 'Yes. Contact our B2B team to discuss account setup and recurring order options. We can help you establish consistent order cycles so your exam rooms stay stocked without manual reordering each time.',
    },
    {
      question: 'Do you offer volume pricing for clinics that order regularly?',
      answer: 'We offer volume-based pricing for practices that maintain consistent ordering. Contact our B2B team to discuss pricing tiers appropriate for your practice\'s order volume.',
    },
    {
      question: 'How do I find supplies specific to my specialty?',
      answer: 'Browse by category on MDSupplies — we carry supplies relevant to primary care, dermatology, OB/GYN, pediatrics, and other outpatient specialties. Use the search bar to look up specific items or contact our team for sourcing assistance.',
    },
    {
      question: 'Are your products suitable for pediatric practices?',
      answer: 'We carry pediatric-appropriate sizes in gloves, exam supplies, and related consumables. Browse the relevant categories or contact our team if you need help identifying pediatric-appropriate products for your practice.',
    },
  ],
},
```

- [ ] **Step 6: Add the new `pharmacies` entry**

Append this new entry to the `INDUSTRIES` array:

```ts
{
  name: 'Pharmacies',
  slug: 'pharmacies',
  collectionHandle: 'pharmacies',
  description: 'Diabetic care, home monitoring, incontinence, and OTC medical supplies for pharmacy retail and patient support.',
  image: '',
  buyerType: 'Pharmacy owners, buyers, and retail managers sourcing front-end medical supply inventory, diabetic care products, home monitoring devices, and patient-facing consumables.',
  faq: [
    {
      question: 'What medical supplies can pharmacies stock and sell to patients?',
      answer: 'Pharmacies commonly stock diabetic care supplies, blood glucose monitors, lancets, incontinence products, wound care items, compression stockings, and mobility aids. MDSupplies carries these categories with wholesale ordering options suitable for pharmacy purchasing.',
    },
    {
      question: 'Do you offer wholesale pricing for pharmacy buyers?',
      answer: 'Yes. We offer volume-based pricing for pharmacy accounts that order regularly. Contact our B2B team to set up a pharmacy account and discuss pricing tiers.',
    },
    {
      question: 'Can I source diabetic care supplies and home monitoring equipment through MDSupplies?',
      answer: 'We carry lancets, glucose test strips, and related diabetic care consumables, as well as home monitoring supplies. Browse the relevant categories or contact our team to discuss sourcing for your pharmacy\'s front-end needs.',
    },
    {
      question: 'Are there products suitable for pharmacy resale to patients?',
      answer: 'Yes. Many of the products we carry are appropriate for pharmacy retail, including wound care, incontinence, personal care, and home health items. Review individual product listings for intended use and packaging details.',
    },
    {
      question: 'How do I manage recurring supply orders for my pharmacy?',
      answer: 'Contact our B2B team to discuss account management and recurring order options. We can help you establish a consistent ordering cycle aligned with your pharmacy\'s inventory replenishment schedule.',
    },
  ],
},
```

- [ ] **Step 7: Verify TypeScript compiles cleanly**

```bash
cd /path/to/repo && npx tsc --noEmit 2>&1 | grep "lib/industries"
```

Expected: no output (no errors in that file).

- [ ] **Step 8: Commit**

```bash
git add lib/industries.ts
git commit -m "feat: add faq copy to industry pages and add clinics/pharmacies entries"
```

---

## Task 2: Wire `faq` through the industry detail page

**Files:**
- Modify: `app/industries/[industry-slug]/page.tsx` (line 86, inside the `industry` object literal)

**Interfaces:**
- Consumes: `Industry` type from `lib/industries.ts` which now has `faq?: FAQ[]`
- Produces: `industry.faq` passed to `<IndustryPage>` → rendered by `FAQSection`

- [ ] **Step 1: Add `faq` to the industry object**

In `app/industries/[industry-slug]/page.tsx`, find the `industry` object literal (lines 66–86). Add one line after `ctaLink`:

```ts
  const industry: Industry = {
    slug: industryStatic.slug,
    name: industryStatic.name,
    isPopulated: relevantProducts.length > 0,
    intro: industryStatic.description,
    buyerType: industryStatic.buyerType,
    heroImage: industryStatic.image
      ? { url: industryStatic.image, altText: `${industryStatic.name} supplies` }
      : undefined,
    relevantCategories: [
      { handle: industryStatic.collectionHandle, title: industryStatic.name },
    ],
    relevantSubcategories: subcategories.map((s) => ({
      handle: `${industryStatic.collectionHandle}-${s.slug}`,
      title: s.label,
    })),
    relevantProducts,
    relatedGuides: [],
    ctaText: `Browse ${industryStatic.name} Supplies`,
    ctaLink: `/category/${industryStatic.collectionHandle}`,
    faq: industryStatic.faq,
  }
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | grep "industry"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add app/industries/\[industry-slug\]/page.tsx
git commit -m "feat: thread faq from static industry data into IndustryPage"
```

---

## Task 3: Update `lib/occ.ts` for broader charity scope

**Files:**
- Modify: `lib/occ.ts`

**Interfaces:**
- Produces: Updated `OCC_HUB` with broader charity mission in `intro`, `programExplanation`, `faq`, `seoTitle`, `seoDescription`

- [ ] **Step 1: Replace the OCC_HUB content**

Replace the full content of `lib/occ.ts` with:

```ts
import type { OCCHub } from '@/types/occ'

export const OCC_HUB: OCCHub = {
  title: 'Charity & Nonprofit Medical Supply Program',
  intro: 'MDSupplies supports charitable organizations, nonprofits, and community programs with streamlined medical supply ordering, preferred pricing, and dedicated account support — whether you run a food pantry, a free clinic, a faith-based health ministry, or a community health drive.',
  programExplanation: 'Our Organized Customer Care (OCC) program is open to qualifying nonprofits and charitable organizations that need reliable access to medical and care supplies. Eligible organizations receive dedicated account management, priority fulfillment, and access to volume-based pricing tiers. We work with food banks, disaster relief teams, free clinics, faith-based ministries, school health programs, and other community-serving organizations.',
  freeShippingMessage: 'Qualifying OCC members may be eligible for free standard shipping on select product categories. Your account manager will confirm eligibility and applicable thresholds.',
  eligibleCategories: [
    { handle: 'exam-gloves', title: 'Exam Gloves' },
    { handle: 'wound-care', title: 'Wound Care' },
    { handle: 'personal-care', title: 'Personal Care' },
    { handle: 'disposables', title: 'Disposables' },
  ],
  eligibleProducts: [
    { handle: 'nitrile-exam-gloves-powder-free', title: 'Nitrile Exam Gloves', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Nitrile+Gloves', price: 2499 },
    { handle: 'latex-exam-gloves-powder-free',   title: 'Latex Exam Gloves',  image: 'https://placehold.co/400x400/fef9c3/854d0e?text=Latex+Gloves',  price: 2299 },
    { handle: 'disposable-bed-pads',             title: 'Disposable Bed Pads', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Bed+Pads',      price: 3299 },
    { handle: 'nasal-cannula-adult',             title: 'Nasal Cannula, Adult', image: 'https://placehold.co/400x400/fef9c3/854d0e?text=Cannula',      price: 199  },
    { handle: 'simple-face-mask',                title: 'Simple Face Mask',   image: 'https://placehold.co/400x400/dbeafe/1d4ed8?text=Face+Mask',      price: 299  },
    { handle: 'standard-walker',                 title: 'Standard Walker',    image: 'https://placehold.co/400x400/f0fdf4/166534?text=Walker',          price: 4999 },
  ],
  faq: [
    {
      question: 'What types of organizations qualify for the OCC program?',
      answer: 'The OCC program is open to registered nonprofits, charitable organizations, free clinics, food banks, disaster relief organizations, faith-based health ministries, school health programs, and community health drives. Contact our team to confirm eligibility for your organization.',
    },
    {
      question: 'We run a food bank and community health drive — can we participate?',
      answer: 'Yes. We work with food banks, community pantries, and health drive organizers that need to source gloves, wound care items, personal care products, and other consumables. Contact our B2B team to discuss your program\'s needs.',
    },
    {
      question: 'How does OCC pricing work for nonprofits?',
      answer: 'OCC pricing is tiered based on organization type and order volume. Your dedicated account manager will work with you to establish pricing that reflects your program\'s purchasing patterns. Nonprofit status may be taken into account during account setup.',
    },
    {
      question: 'Does the OCC program include free shipping?',
      answer: 'Free standard shipping may be available on eligible product categories for qualifying OCC members. Your account manager will confirm which categories and order thresholds apply to your account.',
    },
    {
      question: 'How do I apply for OCC membership?',
      answer: 'Contact our B2B team via the contact form on this page. We will verify your organization\'s credentials and set up your account within 1–2 business days.',
    },
    {
      question: 'Can faith-based organizations and church health ministries apply?',
      answer: 'Yes. Faith-based health ministries and church-affiliated community programs that provide care supplies to underserved populations are welcome to apply for OCC membership.',
    },
  ],
  seoTitle: 'Charity & Nonprofit Medical Supply Program — MDSupplies',
  seoDescription: 'MDSupplies supports nonprofits, free clinics, food banks, faith-based ministries, and community organizations with streamlined medical supply ordering and preferred pricing through our OCC program.',
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | grep "occ"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add lib/occ.ts
git commit -m "feat: update OCC hub copy to cover broader charity and nonprofit use cases"
```

---

## Task 4: Create `lib/blog-static.ts` with two articles

**Files:**
- Create: `lib/blog-static.ts`

**Interfaces:**
- Produces: `STATIC_ARTICLES: Record<string, BlogArticle>` — keys are article handles (`types-of-needles`, `types-of-sutures`); values satisfy the `BlogArticle` type from `@/lib/shopify/types`

Note: `BlogArticle` is defined in `lib/shopify/types.ts` as:
```ts
type BlogArticle = {
  id: string
  handle: string
  title: string
  excerpt: string | null
  publishedAt: string
  author: { name: string }
  image: { id: string; url: string; altText: string | null; width: number; height: number } | null
  tags: string[]
  contentHtml: string
}
```

- [ ] **Step 1: Create `lib/blog-static.ts`**

```ts
import type { BlogArticle } from '@/lib/shopify/types'

export const STATIC_ARTICLES: Record<string, BlogArticle> = {
  'types-of-needles': {
    id: 'static-types-of-needles',
    handle: 'types-of-needles',
    title: 'Types of Needles Used in Medical Settings: A Complete Guide',
    excerpt: 'A practical guide to needle gauge, bevel types, needle lengths, and use cases — from intramuscular injections to blood draws.',
    publishedAt: '2026-06-17T00:00:00Z',
    author: { name: 'MDSupplies Editorial Team' },
    image: null,
    tags: ['Needles', 'Clinical Guide'],
    contentHtml: `
<h2>Understanding Needle Gauge</h2>
<p>Needle gauge refers to the diameter of the needle's bore — the higher the gauge number, the thinner the needle. Gauge selection affects patient comfort, flow rate, and which tissues or fluids the needle is appropriate for.</p>
<ul>
  <li><strong>18–21 gauge:</strong> Large-bore needles used for blood draws, IV catheter insertion, and drawing up viscous medications.</li>
  <li><strong>22–25 gauge:</strong> Mid-range gauges used for intramuscular (IM) injections, most standard subcutaneous (SQ) injections, and venipuncture in smaller veins.</li>
  <li><strong>26–30 gauge:</strong> Fine-gauge needles used for insulin injections, allergy testing, intradermal injections, and pediatric or fragile-vein blood draws.</li>
</ul>
<p>Browse <a href="/category/needles-syringes">needles and syringes</a> on MDSupplies to find the gauge appropriate for your clinical setting.</p>

<h2>Bevel Types and Tip Styles</h2>
<p>The bevel is the angled cut at the tip of the needle. It affects how the needle pierces tissue and how smoothly it enters a vein or muscle.</p>
<ul>
  <li><strong>Regular bevel:</strong> Standard for most IM and SQ injections. Medium angle provides a balance of sharpness and tissue trauma.</li>
  <li><strong>Short bevel:</strong> A steeper angle for more controlled entry — common in intradermal injections such as TB skin tests and allergy panels.</li>
  <li><strong>Blunt-tip cannulas:</strong> Used for drawing medications from vials or transferring fluids without risk of coring the vial stopper.</li>
</ul>

<h2>Needle Length and Injection Depth</h2>
<p>Needle length determines the depth of delivery. Selecting the correct length ensures the medication reaches the intended tissue layer.</p>
<ul>
  <li><strong>⅜ in – ½ in:</strong> Intradermal or very shallow subcutaneous injections in pediatric patients or lean adults.</li>
  <li><strong>⅝ in – 1 in:</strong> Standard subcutaneous injections for insulin, heparin, and similar medications in adults.</li>
  <li><strong>1 in – 1½ in:</strong> Intramuscular injections targeting the deltoid, vastus lateralis, or ventrogluteal muscle in adults. Length varies based on patient body composition.</li>
  <li><strong>1½ in – 2 in:</strong> Deep IM injections in larger muscle groups or when greater tissue depth is required.</li>
</ul>

<h2>Common Use Cases by Needle Type</h2>
<p>Matching needle type to clinical task reduces patient discomfort and procedure risk:</p>
<ul>
  <li><strong>Phlebotomy / blood draws:</strong> 21–23 gauge, 1 in length, standard bevel.</li>
  <li><strong>IM injections (vaccines, hormones):</strong> 22–25 gauge, 1–1½ in, standard bevel.</li>
  <li><strong>SQ injections (insulin, anticoagulants):</strong> 25–28 gauge, ½–⅝ in, standard bevel.</li>
  <li><strong>Intradermal (TB test, allergy):</strong> 26–27 gauge, ⅜–½ in, short bevel.</li>
  <li><strong>IV access / catheter insertion:</strong> 18–20 gauge, winged infusion set or over-the-needle catheter.</li>
  <li><strong>Drawing up medications:</strong> 18-gauge blunt-tip filter needle or standard needle from multi-dose vials.</li>
</ul>

<h2>Choosing the Right Needle for Your Setting</h2>
<p>Clinical setting, patient population, and procedure type all influence the right needle selection. Urgent care centers and primary care practices typically maintain a range of gauges from 21 to 27 and lengths from ½ in to 1½ in to cover most common procedures. HRT clinics performing pellet insertions and hormone injections require specialized needles matched to their specific protocols.</p>
<p>MDSupplies carries needles, syringes, and injection supplies from trusted manufacturers. Browse the <a href="/category/needles-syringes">needles and syringes category</a> to find the right gauge, length, and bevel for your clinical needs — with ordering options suited to practice-level and bulk volumes.</p>
    `.trim(),
  },

  'types-of-sutures': {
    id: 'static-types-of-sutures',
    handle: 'types-of-sutures',
    title: 'Types of Sutures: Absorbable, Non-Absorbable, and When to Use Each',
    excerpt: 'A clinical overview of suture materials, absorbability, thread construction, and wound closure guidance for healthcare professionals.',
    publishedAt: '2026-06-17T00:00:00Z',
    author: { name: 'MDSupplies Editorial Team' },
    image: null,
    tags: ['Sutures', 'Wound Care', 'Clinical Guide'],
    contentHtml: `
<h2>Absorbable vs. Non-Absorbable Sutures</h2>
<p>The most fundamental distinction in suture selection is whether the suture material is absorbed by the body over time or must be removed manually.</p>
<ul>
  <li><strong>Absorbable sutures</strong> are broken down by the body through enzymatic degradation or hydrolysis. They are used for internal layers, subcutaneous closures, and situations where suture removal would be impractical or distressing (pediatric patients, mucosal tissue). Absorption timelines range from 10 days to several months depending on the material.</li>
  <li><strong>Non-absorbable sutures</strong> remain intact indefinitely and must be removed by a clinician. They are preferred for skin closures, external wounds, and situations requiring long-term tensile strength. Common removal windows are 3–14 days depending on wound location.</li>
</ul>

<h2>Monofilament vs. Braided Sutures</h2>
<p>Thread construction affects handling, knot security, and infection risk:</p>
<ul>
  <li><strong>Monofilament:</strong> A single continuous strand that glides through tissue with minimal drag and has lower bacterial wicking. Easier to remove. Requires more throws to secure a knot and has more memory (springback during tying). Common monofilament sutures include nylon (Ethilon), polypropylene (Prolene), and poliglecaprone (Monocryl — absorbable).</li>
  <li><strong>Braided / multifilament:</strong> Multiple strands twisted or braided together for superior knot security and handling. Braided sutures have more tissue drag and a higher theoretical risk of bacterial colonization in contaminated wounds. Common braided sutures include polyglactin 910 (Vicryl — absorbable), polyester (Ethibond), and silk.</li>
</ul>

<h2>Common Suture Materials and Their Uses</h2>
<p>Understanding each material helps clinicians select the right suture for the tissue type and healing environment:</p>
<ul>
  <li><strong>Polyglactin 910 (Vicryl):</strong> Braided, absorbable. Absorbed in 56–70 days. Widely used for subcutaneous closures, fascial repair, and mucosal tissue. Excellent knot security.</li>
  <li><strong>Poliglecaprone (Monocryl):</strong> Monofilament, absorbable. Absorbed in 91–119 days. Smooth passage through tissue; often used for subcuticular skin closures and delicate tissue.</li>
  <li><strong>Chromic gut:</strong> Natural absorbable suture treated with chromic salts to slow absorption (21–28 days). Used in mucosal and highly vascular tissue such as the vaginal cuff, oral mucosa, and bladder.</li>
  <li><strong>Nylon (Ethilon, Dermalon):</strong> Monofilament, non-absorbable. Excellent tensile strength with low reactivity. Standard choice for skin closure; must be removed post-healing.</li>
  <li><strong>Polypropylene (Prolene):</strong> Monofilament, non-absorbable. Minimal tissue reactivity; used in vascular anastomosis, cardiovascular surgery, and skin closures where long-term strength is needed.</li>
  <li><strong>Silk:</strong> Braided, non-absorbable (though it does degrade slowly). Easy handling and knot security; historically common but now largely replaced by synthetic materials. Still used in ophthalmic and cardiovascular settings.</li>
  <li><strong>Polyester (Ethibond, Mersilene):</strong> Braided, non-absorbable. High tensile strength for cardiovascular and orthopedic applications.</li>
</ul>

<h2>Suture Size and Tissue Selection</h2>
<p>Suture size is expressed as a number of zeros — the more zeros, the finer the suture. A 2-0 (two-zero) suture is thicker than a 5-0:</p>
<ul>
  <li><strong>0 – 1:</strong> Heavy tissue — fascia, abdominal wall closure, orthopedic repair.</li>
  <li><strong>2-0 – 3-0:</strong> Subcutaneous layers, muscle, and moderate-tension skin closures.</li>
  <li><strong>4-0:</strong> General skin closure on most body areas; also used for oral mucosa and pediatric wounds.</li>
  <li><strong>5-0 – 6-0:</strong> Delicate tissue — facial lacerations, hand and finger repairs, plastic surgery closures.</li>
  <li><strong>7-0 and finer:</strong> Ophthalmic and microsurgical procedures.</li>
</ul>

<h2>Wound Closure Best Practices</h2>
<p>Suture selection is one component of successful wound closure. Additional considerations for clinical settings:</p>
<ul>
  <li>Match suture absorption timeline to expected wound healing time — a suture that loses strength before the wound closes creates dehiscence risk.</li>
  <li>Use absorbable suture for internal layers so patients do not require a second procedure for removal.</li>
  <li>In contaminated or infection-prone wounds, monofilament sutures reduce bacterial wicking compared to braided alternatives.</li>
  <li>Needle selection matters as much as thread — tapered needles for soft internal tissue, cutting needles for tough skin and fascia.</li>
</ul>
<p>MDSupplies carries sutures and wound closure supplies from established manufacturers. Browse the <a href="/category/wound-care">wound care category</a> and <a href="/category/surgical-sutures">surgical sutures</a> to find the right material, size, and needle type for your clinical needs.</p>
    `.trim(),
  },
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | grep "blog-static"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add lib/blog-static.ts
git commit -m "feat: add static blog articles for types-of-needles and types-of-sutures"
```

---

## Task 5: Patch `app/blog/[handle]/page.tsx` for static-first lookup

**Files:**
- Modify: `app/blog/[handle]/page.tsx`

**Interfaces:**
- Consumes: `STATIC_ARTICLES` from `lib/blog-static.ts` — `Record<string, BlogArticle>`
- Produces: Static articles pre-rendered at build time; static-first check in `findArticle`, `generateStaticParams`, `generateMetadata`

- [ ] **Step 1: Add the import**

At the top of `app/blog/[handle]/page.tsx`, after the existing imports, add:

```ts
import { STATIC_ARTICLES } from '@/lib/blog-static'
```

- [ ] **Step 2: Patch `findArticle` to check static map first**

Replace the `findArticle` function (lines 26–43) with:

```ts
async function findArticle(
  handle: string,
): Promise<{ blogHandle: string; article: BlogArticle } | null> {
  if (STATIC_ARTICLES[handle]) {
    return { blogHandle: 'static', article: STATIC_ARTICLES[handle] }
  }

  const data = await storefrontFetch<{ blogs: { nodes: Array<{ handle: string }> } }>(
    GET_BLOG_HANDLES,
  );

  for (const blog of data.blogs.nodes) {
    const result = await storefrontFetch<{
      blog: { articleByHandle: BlogArticle | null } | null;
    }>(GET_ARTICLE, { blogHandle: blog.handle, articleHandle: handle });

    if (result.blog?.articleByHandle) {
      return { blogHandle: blog.handle, article: result.blog.articleByHandle };
    }
  }
  return null;
}
```

- [ ] **Step 3: Patch `generateStaticParams` to inject static handles**

Replace `generateStaticParams` (lines 45–57) with:

```ts
export async function generateStaticParams() {
  const staticHandles = Object.keys(STATIC_ARTICLES).map((handle) => ({ handle }))

  try {
    const data = await storefrontFetch<{
      blogs: { nodes: Array<{ handle: string; articles: { nodes: Array<{ handle: string }> } }> };
    }>(GET_ALL_ARTICLE_HANDLES);

    const shopifyHandles = data.blogs.nodes.flatMap((blog) =>
      blog.articles.nodes.map((a) => ({ handle: a.handle })),
    )

    const seen = new Set(staticHandles.map((h) => h.handle))
    const merged = [
      ...staticHandles,
      ...shopifyHandles.filter((h) => !seen.has(h.handle)),
    ]
    return merged
  } catch {
    return staticHandles
  }
}
```

- [ ] **Step 4: Patch `generateMetadata` to check static map first**

Replace the `generateMetadata` function (lines 59–75) with:

```ts
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;

  if (STATIC_ARTICLES[handle]) {
    const article = STATIC_ARTICLES[handle]
    return buildMetadata({
      pageType: 'blog-article',
      title: article.title,
      description: article.excerpt?.slice(0, 155) ?? undefined,
      slug: handle,
      image: article.image?.url,
    })
  }

  try {
    const found = await findArticle(handle);
    if (!found) return buildMetadata({ pageType: 'blog-article', slug: handle });
    const { article } = found;
    return buildMetadata({
      pageType: 'blog-article',
      title: article.title,
      description: article.excerpt?.slice(0, 155) ?? undefined,
      slug: handle,
      image: article.image?.url,
    });
  } catch {
    return buildMetadata({ pageType: 'blog-article', slug: handle });
  }
}
```

- [ ] **Step 5: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | grep "blog"
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add app/blog/\[handle\]/page.tsx
git commit -m "feat: static-first blog article lookup with Shopify fallback"
```

---

## Task 6: Write `docs/reviews-research.md`

**Files:**
- Create: `docs/reviews-research.md`

**Interfaces:**
- Produces: Research doc answering all 6 §11.3 questions with a clear recommendation

- [ ] **Step 1: Create `docs/reviews-research.md`**

```markdown
# Third-Party Reviews Research

**Date:** 2026-06-17
**Source:** Closeout doc §11.3
**Status:** Research only — no implementation

---

## 1. Can existing Trust Reviews data be exported and migrated?

**Yes, with conditions.** Most Trust Reviews / Trustoo plans allow data export via their admin dashboard as a CSV or JSON file. The exported data typically includes reviewer name, star rating, review text, product handle, and submission date. This data can be re-imported into:

- The same app on a new store or plan
- A compatible reviews app that accepts CSV import (e.g., Judge.me, Yotpo, Okendo)
- A custom database if building a proprietary review store

**What to verify before migrating:**
- Export includes product handles that match the new store's product handles (if products were consolidated, handle mismatches will orphan reviews)
- The target app accepts import in the Trust Reviews export format, or has a conversion path
- Reviewer consent was captured in a way compatible with the new storage location (GDPR/CCPA consideration)

**Risk level:** Low, if done carefully before the old plan is downgraded or cancelled.

---

## 2. Can Google Shopping / Product Ratings be used or surfaced?

**Yes, but eligibility requirements are strict.** Google Product Ratings (shown as stars in Shopping ads and organic product listings) require:

- A minimum of 50 reviews across all products (aggregate threshold)
- Reviews sourced from a Google-approved aggregator or collected through a Google-licensed partner (e.g., Yotpo, Bazaarvoice, PowerReviews, or a Google Product Ratings-approved app)
- A product feed in Google Merchant Center with matching GTINs or identifiers
- Reviews must be genuine, not incentivized without disclosure, and comply with Google's review policies

**Trust Reviews / Trustoo** is not currently on Google's approved aggregator list (as of 2025). To surface ratings in Shopping, MDSupplies would need to either:
- Migrate to a Google-approved app (Judge.me and Yotpo both have Google integration paths)
- Submit a custom feed to Google's Product Ratings program (requires XML feed setup and Google approval)

**Risk level:** Medium — requires app migration and Google Merchant Center setup. Not a quick win.

---

## 3. Can manufacturer/vendor reviews be used with permission?

**Conditionally yes.** If a manufacturer or distributor explicitly grants written permission to republish their product reviews, MDSupplies may display them with proper attribution. However:

- The permission must be explicit and in writing (email confirmation is sufficient, a formal license is better)
- The reviews must be accurately attributed to their source
- They cannot be presented as MDSupplies-verified purchases if they were not
- Review schema markup cannot be applied to third-party reviews unless MDSupplies is the verified aggregator of those reviews
- The reviews must not be edited for sentiment or selectively curated to misrepresent the product

**Practical challenge:** Most manufacturers do not actively grant this permission, and pursuing it adds significant coordination overhead for uncertain return.

**Risk level:** Medium-high — possible legally but operationally difficult and schema-ineligible.

---

## 4. Can Amazon or marketplace reviews legally be embedded, referenced, or summarized?

**No — not safely.**

- **Embedding:** Amazon's Terms of Service prohibit scraping or republishing product reviews. Review content is copyrighted by the reviewer; Amazon holds a license that does not extend to third parties.
- **Direct quotation:** Quoting individual Amazon reviews without permission from the reviewer and Amazon is a copyright and TOS violation.
- **Summarizing:** AI-generated summaries of Amazon reviews for republication are in a legal grey zone — they can still constitute derivative works and violate Amazon's TOS even if individual quotes are paraphrased.
- **Star count references:** Stating "rated X stars on Amazon" references a number, not copyrighted text, but Amazon's TOS still prohibit using their brand or data in ways that imply endorsement or affiliation.

**Risk level:** High — do not implement. Legal exposure is real and Amazon actively enforces.

---

## 5. Risks: copyright, platform TOS, fake-review policy, and schema eligibility

| Risk Area | Details |
|---|---|
| **Copyright** | Review text is owned by the reviewer. Republishing without permission is infringement. Platforms (Amazon, Google, Yelp) hold platform licenses that don't extend downstream. |
| **Platform TOS** | Amazon, Google Shopping, and Yelp all prohibit scraping or republishing review content. Violations can result in account suspension or legal action. |
| **Fake review policy** | Google, FTC, and the EU Digital Services Act all have explicit rules against fake or incentivized reviews without disclosure. Using fabricated reviews or selectively curating to mislead constitutes deceptive marketing. FTC penalties can be significant. |
| **Schema eligibility** | `Review` and `AggregateRating` schema in Google's guidelines require: reviews collected by the site operator, from verified purchasers, not paid without disclosure. Third-party or sourced reviews are schema-ineligible. Hidden or markup-only schema (not visible on page) violates Google's structured data guidelines and can result in manual penalties. |

---

## 6. Can review schema be used only for MDSupplies-owned verified reviews?

**Yes — this is the only safe path for schema.** Google's structured data guidelines for `Review` and `AggregateRating` permit schema only when:

- MDSupplies collected the reviews directly (on-site review system or a licensed partner like Trust Reviews, Judge.me, Yotpo)
- The reviews are from verified purchasers
- The reviews are visibly displayed on the page (no hidden schema)
- The rating displayed in schema matches the rating shown to users

Using schema for reviews collected by a third party that MDSupplies does not operate is a guideline violation. This includes manufacturer reviews, Amazon reviews, or any reviews not flowing through MDSupplies' own review system.

---

## Recommendation

**Keep the Trust Reviews app. Export and safeguard the existing review data now. Build a Resend post-purchase review-request email flow. Defer all external aggregation until post-launch.**

### Rationale

1. **Export first:** Run a full export of current Trust Reviews data before any plan changes. Store the CSV in a secure location. This protects existing social proof regardless of what app is used going forward.

2. **Keep Trust Reviews for now:** Switching apps mid-launch adds risk with no immediate user-facing benefit. Trust Reviews already collects, displays, and stores reviews correctly. Stay with it through launch.

3. **Build the Resend flow post-launch:** After fulfillment tracking is confirmed and the Resend email infrastructure is in place, add a post-purchase trigger that sends a review request email 7–14 days after order delivery. This is the most reliable way to accumulate genuine verified reviews. Use Resend with a simple template — no complex automation needed at launch.

4. **Pursue Google Product Ratings after launch:** Once 50+ verified reviews accumulate through the Trust Reviews app, evaluate migrating to a Google-approved aggregator (Judge.me is the lowest-friction path) to unlock Shopping star ratings. This is a post-launch milestone, not a launch blocker.

5. **Never use Amazon, Yelp, or third-party review content:** The legal and policy risk is not worth it. MDSupplies' brand credibility is better served by a smaller number of genuine verified reviews than by borrowed content that creates legal exposure.

6. **Schema:** Apply `Review` and `AggregateRating` schema only once MDSupplies has 3+ verified reviews on a product and those reviews are visibly displayed. Do not add schema preemptively or to products with no visible reviews.
```

- [ ] **Step 2: Commit**

```bash
git add docs/reviews-research.md
git commit -m "docs: add third-party reviews research and recommendation (§11.3)"
```

---

## Self-Review

**Spec coverage check:**

| §11 requirement | Task |
|---|---|
| 6 industry pages with FAQ | Tasks 1 + 2 |
| FAQ schema only where visible content exists | Already enforced by `FAQSection`; no new code needed |
| No unsupported shipping/medical claims in FAQ copy | Verified — all FAQ copy uses "contact our team", no delivery promises |
| OCC covers broader charity use cases | Task 3 |
| Blog hub + detail template (already built) | No task needed |
| Priority rebuilt articles: Types of Needles, Types of Sutures | Task 4 + 5 |
| Internal links from blog → categories | Done in article HTML (`/category/needles-syringes`, `/category/wound-care`, `/category/surgical-sutures`) |
| BunnyCDN hero/industry images | New entries have `image: ''` — hero gracefully absent until BunnyCDN URLs are available (out of scope per spec) |
| Reviews research doc | Task 6 |
| OCC eligible-product handles verified | Out of scope per design spec (flagged as ops task, not dev task) |

**No placeholders, no TODOs, no "similar to above" steps found.**

**Type consistency:** `STATIC_ARTICLES` uses `BlogArticle` from `@/lib/shopify/types` directly — no custom interface, no type mismatch possible.
