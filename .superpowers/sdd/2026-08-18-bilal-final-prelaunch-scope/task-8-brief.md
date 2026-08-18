## Task 8: Re-confirm packaging display safety rules under the new scope

**Files:**
- Read: `components/product/ProductView.tsx` (ORDER PACKAGING tab)
- Test: `components/product/__tests__/ProductView.test.tsx` (extend existing LG-04 describe block, per the 2026-08-17 session's prior work)

**Interfaces:**
- Consumes: `selectedVariant.innerPackQuantity` / `.packsPerCase` / `.totalOrderQuantity` / `.orderSize` / `.unitsPerOrder` (all pre-existing, per prior session)

Per the prior session's QA evidence doc (`docs/launch/2026-08-17-qa-evidence-and-production-readiness.md`), this was already verified for 3 named products with a passing sibling-leak test. Bilal's new message adds one explicit requirement not yet tested: "If packaging differs and the selected variant lacks its own value, do not display another variant's quantity. Show 'Packaging information unavailable for this option.'" — confirm this exact copy is what's currently shown (the prior doc's browser walkthrough logged the string "Packaging information not available for this product" — **note the wording differs from Bilal's new message**: "for this option" vs. "for this product." Resolve this discrepancy explicitly, don't assume it's a typo in one or the other).

- [ ] **Step 1: Find and quote the exact current fallback copy**

`grep -n "Packaging information" components/product/ProductView.tsx` — read the surrounding code, quote the literal string in this task's notes.

- [ ] **Step 2: Compare against Bilal's exact requested copy**

If the strings differ, this is a product-copy decision, not an obvious bug — do not silently rewrite it. Flag the discrepancy in the Task 12 evidence doc as a one-line question back to Bilal ("current fallback reads '[X]', your message says '[Y]' — confirm before merging'') rather than guessing which is authoritative.

- [ ] **Step 3: Write a test for the "differs + selected variant blank" case if none exists**

Check whether the existing LG-04 test suite already covers a variant with partial packaging data (variant A has values, sibling variant B has none) — the prior session's evidence doc §3 covered "another variant's values don't leak," but confirm a variant with **zero** packaging fields, when its sibling has some, shows the fallback string and not an empty/blank row. If this exact case isn't covered, add it following the existing test file's fixture pattern.

- [ ] **Step 4: Run and confirm green**

Run: `npm test -- components/product/__tests__/ProductView.test.tsx`
Expected: PASS (this task is expected to mostly confirm existing correct behavior, not fix bugs — treat any failure as a real regression worth investigating via systematic-debugging, not a copy-paste fix).

- [ ] **Step 5: Commit** (only if a new test was added)

```bash
git add components/product/__tests__/ProductView.test.tsx
git commit -m "test(pdp): cover fully-blank sibling-variant packaging fallback"
```

---

