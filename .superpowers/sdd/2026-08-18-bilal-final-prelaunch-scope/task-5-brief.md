## Task 5: Fix wrong variant image in cart popup and cart page

**Files:**
- Modify: `lib/shopify/queries/cart.ts:14-18` (add `image` to the `ProductVariant` selection inside `merchandise`)
- Modify: `lib/shopify/types.ts:248-277` (`CartLine.merchandise`, add `image?: ProductImage | null`)
- Modify: `components/store/CartPopup.tsx:170`
- Modify: `components/store/CartPageClient.tsx:123`
- Test: `components/store/__tests__/CartPopup.test.tsx`, `components/store/__tests__/CartPageClient.test.tsx`

**Interfaces:**
- Consumes: `ProductImage` type (already imported/used elsewhere in `types.ts`, same shape as `ProductVariant.image` at `types.ts:90`)
- Produces: `CartLine.merchandise.image?: ProductImage | null` — both components read this new field

Confirmed live bug: both components read `line.merchandise.product.images.nodes[0]` — the **product's** first image, not the line's selected variant's own image (e.g. a Blue/White/Grey AeroWalk line in the cart shows whichever color happens to be the product's first image, regardless of which color was added). The GraphQL query never selects a variant-level `image` field today, so the data isn't even available to prefer.

- [ ] **Step 1: Write the failing test**

In `components/store/__tests__/CartPopup.test.tsx`, extend the existing line-item fixture (`merchandise: { ... product: { ..., images: { nodes: [] } } }`, ~line 77-84) to add both a variant-level image and a *different* product-level image, then assert the variant image wins:

```ts
merchandise: {
  id: 'variant-1',
  title: 'Blue',
  sku: 'SKU-1',
  image: { id: 'img-variant', url: 'https://example.com/blue.jpg', altText: 'Blue variant', width: 100, height: 100 },
  price: { amount: '19.99', currencyCode: 'USD' },
  selectedOptions: [{ name: 'Color', value: 'Blue' }],
  product: {
    id: 'prod-1', title: 'Xylocaine Injection', handle: 'xylocaine',
    images: { nodes: [{ id: 'img-product', url: 'https://example.com/grey.jpg', altText: 'Grey (product default)', width: 100, height: 100 }] },
    ...product,
  },
},
```

```ts
it('shows the selected variant\'s own image, not the product\'s first image', () => {
  // ...render with the line above...
  const img = screen.getByAltText('Blue variant')
  expect(img).toHaveAttribute('src', expect.stringContaining('blue.jpg'))
  expect(screen.queryByAltText('Grey (product default)')).not.toBeInTheDocument()
})
```

Add the matching test in `components/store/__tests__/CartPageClient.test.tsx` following that file's existing fixture pattern (same `merchandise.product.images.nodes` shape at line 123's surrounding test setup).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- components/store/__tests__/CartPopup.test.tsx components/store/__tests__/CartPageClient.test.tsx`
Expected: FAIL — both components render the "grey.jpg" product image, not "blue.jpg".

- [ ] **Step 3: Add `image` to the cart GraphQL query**

In `lib/shopify/queries/cart.ts`, inside the `... on ProductVariant` block (after line 18, `sku`, before `price`):

```ts
            id
            title
            sku
            image { id url altText width height }
```

- [ ] **Step 4: Add the field to the `CartLine` type**

In `lib/shopify/types.ts`, inside `CartLine.merchandise` (after `sku: string | null;` at line 251):

```ts
    sku: string | null;
    /** Shopify's own variant-media assignment — same field/shape as
        ProductVariant.image. Null when the variant has no image of its own;
        callers fall back to the product's shared gallery image only then,
        never showing a sibling variant's assigned image. */
    image?: ProductImage | null;
```

- [ ] **Step 5: Fix both components to prefer the variant image**

In `components/store/CartPopup.tsx:170`, replace:

```ts
const image = line.merchandise.product.images.nodes[0]
```

with:

```ts
const image = line.merchandise.image ?? line.merchandise.product.images.nodes[0]
```

Apply the identical change in `components/store/CartPageClient.tsx:123`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- components/store/__tests__/CartPopup.test.tsx components/store/__tests__/CartPageClient.test.tsx`
Expected: PASS. Then run the full suite (`npm test`) to confirm no other test asserting the old `merchandise.product.images` cart shape broke — if one does, update its fixture to match the new (backward-compatible, still-optional) field rather than changing the components back.

- [ ] **Step 7: Commit**

```bash
git add lib/shopify/queries/cart.ts lib/shopify/types.ts components/store/CartPopup.tsx components/store/CartPageClient.tsx components/store/__tests__/CartPopup.test.tsx components/store/__tests__/CartPageClient.test.tsx
git commit -m "fix(cart): show the selected variant's own image, not the product's first image"
```

---

