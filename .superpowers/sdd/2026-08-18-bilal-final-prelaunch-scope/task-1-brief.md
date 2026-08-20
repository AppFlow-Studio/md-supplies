## Task 1: Fix the Trocar Supplies filter registry to match Izzy's approved 8 filter groups

**Files:**
- Modify: `lib/filter-registry.ts:245` (the `trocars-trocar-kits` entry) and its `APPROVED_METAFIELDS` map (`lib/filter-registry.ts:59-122`) if `gloveSize` needs no new entry (it already exists at line 62 — confirm, don't re-add)
- Modify: `lib/__tests__/filter-registry.test.ts` — extend `HOSTILE_FACETS` (lines 43-62) and add a new `it(...)` in the `describe('page-specific facet sets', ...)` block (starts line 105)

**Interfaces:**
- Consumes: `APPROVED_METAFIELDS.material`, `.gloveSize`, `.size`, `.features`, `.otherFeatures`, `.use` (all already defined in `lib/filter-registry.ts`), `cat(...)` helper (line 192), `TAIL` (line 189, already supplies Order Size/Brand Name/Price/Certification)
- Produces: nothing new consumed elsewhere — this is a leaf data fix

The current registry entry is wrong: it lists `M.type, M.material, M.size, M.needleGauge, M.length, M.features, M.otherFeatures, M.sterility, M.use, M.color` — none of `type`, `needleGauge`, `length`, `sterility`, `color` exist on Trocar products per Izzy's verified registry (Trocar has `custom.customer_filter_category`, `custom.order_size`, `custom.brand_name`, `custom.use`, `custom.material`, `custom.size_length_`, `custom.other_features`, `custom.glove_size`, `custom.features` — nothing else), and `gloveSize` is missing entirely even though it's populated on 27/41 products.

- [ ] **Step 1: Write the failing test**

Add these two facet fixtures to `HOSTILE_FACETS` in `lib/__tests__/filter-registry.test.ts` (insert after the `size_length_` line, ~line 59):

```ts
  facet('filter.p.m.custom.features', 'Features'),
  facet('filter.p.m.custom.other_features', 'Other features'),
  facet('filter.p.m.custom.use', 'Use'),
  facet('filter.p.m.custom.brand_name', 'Brand name'),
  facet('filter.p.m.custom.sterility', 'Sterility'),
  facet('filter.p.m.custom.type', 'Type'),
```

Then add a new test inside `describe('page-specific facet sets', ...)`, after the existing IV Therapy test (~line 179):

```ts
  it('Trocar Supplies shows Izzy\'s 8 approved groups only — no type/needle/length/sterility/color', () => {
    const ids = getAllowedFacets('trocars-trocar-kits', HOSTILE_FACETS).map((f) => f.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'filter.p.m.custom.material',
        'filter.p.m.custom.glove_size',
        'filter.p.m.custom.size_length_',
        'filter.p.m.custom.features',
        'filter.p.m.custom.other_features',
        'filter.p.m.custom.use',
        'filter.p.m.custom.order_size',
        'filter.p.m.custom.brand_name',
        'filter.v.price',
      ]),
    )
    expect(ids).not.toContain('filter.p.m.custom.type')
    expect(ids).not.toContain('filter.p.m.custom.needle_gauge')
    expect(ids).not.toContain('filter.p.m.custom.needle_length')
    expect(ids).not.toContain('filter.p.m.custom.sterility')
    expect(ids).not.toContain('filter.v.option.color')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/__tests__/filter-registry.test.ts`
Expected: FAIL — the new test's positive assertions fail because `glove_size`/`features`/`other_features`/`use`/`brand_name` aren't in the current `trocars-trocar-kits` rule list (the current list is `type`/`material`/`size`/`needleGauge`/`length`/`features`/`otherFeatures`/`sterility`/`use`/`color`, so `glove_size`/`brand_name` positive assertions fail, and `type`/`needle_gauge`/`needle_length`/`sterility` negative assertions also fail since they're currently allowed).

- [ ] **Step 3: Write minimal implementation**

In `lib/filter-registry.ts`, replace line 245:

```ts
  'trocars-trocar-kits': cat(M.type, M.material, M.size, M.needleGauge, M.length, M.features, M.otherFeatures, M.sterility, M.use, M.color),
```

with:

```ts
  // Corrected 2026-08-18 per Izzy's verified Trocar registry (41 active
  // products): custom.material, custom.glove_size, custom.size_length_,
  // custom.features, custom.other_features, custom.use are the only
  // populated metafields on this collection — type/needle_gauge/
  // needle_length/sterility/color never existed on Trocar products; this
  // entry previously copied the needles-syringes template by mistake.
  'trocars-trocar-kits': cat(M.material, M.gloveSize, M.size, M.features, M.otherFeatures, M.use),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/__tests__/filter-registry.test.ts`
Expected: PASS, and the full file's pre-existing tests (including the generic `trocars-trocar-kits` entry in the `category coverage` describe block, line ~383) still pass.

- [ ] **Step 5: Commit**

```bash
git add lib/filter-registry.ts lib/__tests__/filter-registry.test.ts
git commit -m "fix(filters): correct Trocar Supplies facet registry to Izzy's verified metafields"
```

---

