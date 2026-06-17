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
