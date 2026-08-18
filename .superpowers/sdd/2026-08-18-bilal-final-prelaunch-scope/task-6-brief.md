## Task 6: Preserve bold formatting in Vendor Shipping & Returns rich text

**Files:**
- Modify: `lib/policy/rich-text.ts` (add a marks-preserving variant alongside the existing plain-text one)
- Modify: `components/product/ProductView.tsx` (the RETURNS tab's Vendor Shipping & Returns block — find via `shopifyRichTextToPlainParagraphs` usage, imported at line 27)
- Test: `lib/policy/__tests__/rich-text.test.ts`, `components/product/__tests__/ProductView.test.tsx`

**Interfaces:**
- Produces: a new exported type/function in `lib/policy/rich-text.ts`, e.g. `type RichTextSpan = { text: string; bold?: boolean; italic?: boolean }` and `shopifyRichTextToParagraphSpans(raw: string | null | undefined): RichTextSpan[][]` (one inner array per paragraph, matching the existing per-paragraph shape of `shopifyRichTextToPlainParagraphs`)
- Consumes downstream: `ProductView.tsx`'s RETURNS tab renders `RichTextSpan[][]` as `<p>{spans.map(span => span.bold ? <strong>{span.text}</strong> : span.text)}</p>` — bold/italic only, never arbitrary HTML (matches the existing "safe rich-text rendering" constraint from Bilal's message)

`shopifyRichTextToPlainParagraphs` (docstring, `lib/policy/rich-text.ts:19-20`) explicitly strips all inline marks to flat text by design — this is correct for its current caller (`resolveReturnPolicy`'s general policy text, a different, unrelated field) but means bold can never survive for `custom.shipping_returns`. Add a second function rather than changing the existing one's contract, since `resolveReturnPolicy` and any other caller must keep getting flat strings.

- [ ] **Step 1: Write the failing test**

In `lib/policy/__tests__/rich-text.test.ts`, add (matching the file's existing `JSON.stringify({type:'root',children:[...]})` fixture style):

```ts
describe('shopifyRichTextToParagraphSpans', () => {
  it('preserves bold marks within a paragraph as separate spans', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [{
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Returns accepted within ' },
          { type: 'text', value: '30 days', bold: true },
          { type: 'text', value: ' of delivery.' },
        ],
      }],
    })
    const paragraphs = shopifyRichTextToParagraphSpans(raw)
    expect(paragraphs).toEqual([
      [
        { text: 'Returns accepted within ', bold: false },
        { text: '30 days', bold: true },
        { text: ' of delivery.', bold: false },
      ],
    ])
  })

  it('degrades malformed/non-JSON input to an empty array, matching the plain-text function', () => {
    expect(shopifyRichTextToParagraphSpans('not json')).toEqual([])
    expect(shopifyRichTextToParagraphSpans(null)).toEqual([])
  })
})
```

(First read the actual Shopify rich-text AST shape for a bold mark — Shopify's `rich_text_field` marks bold text with `"bold": true` on the text leaf node per Shopify's documented schema; confirm this matches what `custom.shipping_returns`'s real QA value actually contains by re-running `scripts/verify-aerowalk-qa-pilot.ts` or a similar read-only query against a QA product known to have bold text, before trusting the fixture shape above blindly.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/policy/__tests__/rich-text.test.ts`
Expected: FAIL — `shopifyRichTextToParagraphSpans` doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

In `lib/policy/rich-text.ts`, add alongside the existing code (don't modify `extractText`/`shopifyRichTextToPlainParagraphs`):

```ts
export type RichTextSpan = { text: string; bold: boolean }

function extractSpans(node: ShopifyRichTextNode): RichTextSpan[] {
  if (typeof node.value === 'string') {
    return node.value ? [{ text: node.value, bold: Boolean((node as { bold?: boolean }).bold) }] : []
  }
  if (!node.children) return []
  return node.children.flatMap(extractSpans)
}

/**
 * Same paragraph/list-item flattening as shopifyRichTextToPlainParagraphs,
 * but preserves bold marks as spans instead of discarding them — for the one
 * caller (Vendor Shipping & Returns) that needs safe bold rendering.
 * Italic/links stay stripped to plain text (not requested); only bold is
 * carried through, so the render side stays a narrow, safe <strong>-only path.
 */
export function shopifyRichTextToParagraphSpans(raw: string | null | undefined): RichTextSpan[][] {
  if (!raw) return []
  let root: ShopifyRichTextNode
  try {
    root = JSON.parse(raw)
  } catch {
    return []
  }

  const paragraphs: RichTextSpan[][] = []
  const walk = (node: ShopifyRichTextNode) => {
    if (node.type === 'list' && node.children) {
      node.children.forEach(walk)
      return
    }
    const spans = extractSpans(node)
    if (spans.some((s) => s.text.trim())) paragraphs.push(spans)
  }
  root.children?.forEach(walk)
  return paragraphs
}
```

`ShopifyRichTextNode`'s type at the top of the file doesn't declare `bold` — extend it: add `bold?: boolean` to the type at line 1-5.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/policy/__tests__/rich-text.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the RETURNS tab to render spans with `<strong>`**

Read the exact current RETURNS-tab JSX in `ProductView.tsx` that calls `shopifyRichTextToPlainParagraphs` for `shippingReturns` (grep for `shippingReturns` in the file to find the call site precisely — do not guess the surrounding JSX). Write a failing test in `ProductView.test.tsx` first (fixture with a bold span in `shippingReturns`, assert a `<strong>` element with the bold text is present and the surrounding plain text is not wrapped), watch it fail, then switch that call site from `shopifyRichTextToPlainParagraphs` to `shopifyRichTextToParagraphSpans` and render each paragraph as `<p>{spans.map((s, i) => s.bold ? <strong key={i}>{s.text}</strong> : <span key={i}>{s.text}</span>)}</p>`.

- [ ] **Step 6: Run full ProductView test file, verify green**

Run: `npm test -- components/product/__tests__/ProductView.test.tsx`
Expected: PASS, including all pre-existing Vendor Shipping & Returns tests (hidden-when-empty behavior must be unchanged — verify the empty-string/null case still renders nothing).

- [ ] **Step 7: Commit**

```bash
git add lib/policy/rich-text.ts lib/policy/__tests__/rich-text.test.ts components/product/ProductView.tsx components/product/__tests__/ProductView.test.tsx
git commit -m "feat(pdp): preserve bold formatting in Vendor Shipping & Returns rich text"
```

---

