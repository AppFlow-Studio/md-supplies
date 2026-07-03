# Product-card quick-add hover behavior — design

**Ticket:** P1 — product-card CRO. Plus/add-to-cart button is awkwardly positioned; needs a clean hover-to-reveal behavior on desktop and a separate visible behavior on mobile.

## Scope

**In scope:** `components/store/ShopifyProductCard.tsx` + `components/store/ShopifyQuickAddButton.tsx`, which render the category/collection grid cards (`components/category/ProductGrid.tsx`) and the partner product listing (`app/partners/[partner-slug]/products/page.tsx`). This matches the ticket's screenshot caption ("Product card component — category/collection grid").

**Out of scope:** The ticket's dependency note claims this is a "shared component" also used on the homepage cards referenced by P0-6. That's not accurate — the homepage uses two different, unrelated implementations:
- `components/home/HeroSection.tsx` → `components/product/ProductCard.tsx` + `ProductCardClient.tsx`: a full-width "Quick Add" text button, always visible at the bottom of the card.
- `components/home/PopularProducts.tsx`: an inline plus-icon + "Quick Add" text button, also always visible at the bottom of the card.

Neither is a floating hover-only overlay, and neither shares code with `ShopifyQuickAddButton`. Both are intentionally different button styles for a different card layout and are left untouched by this ticket. Flagging this here so the mismatch doesn't resurface as a surprise later.

## Current state

`ShopifyQuickAddButton` already implements hide-by-default / reveal-on-hover (`opacity-0 group-hover:opacity-100`) — it is not "visible by default" as the ticket text describes. What's actually wrong:

1. **Position:** `absolute top-2 right-2`, positioned relative to the *entire card's* relative wrapper (`ShopifyProductCard`'s outer `group relative` div). Because the image happens to start at the top of the card with no offset, this visually lands in the image's top-right corner — but it's anchored to the card, not the image.
2. **Animation:** plain opacity fade only, no motion.
3. **Mobile:** since mobile has no real `:hover`, `opacity-0` never flips to `opacity-100` — the button is effectively unreachable on touch devices today.

## Why "bottom-right" needs a DOM change, not just a class swap

If the button's position class were simply changed from `top-2` to `bottom-2` on the existing DOM structure, it would be relative to the *whole card* (image + vendor/title/price block), landing on top of the price text — directly violating "doesn't overlap image, title, vendor, or price."

The button needs to be anchored to the *image box* specifically (aspect-square, fixed relative to its own bounds regardless of grid column width), not the full card height.

## Design

### `ShopifyProductCard.tsx` — restructure

Split the current single card-wide `<Link>` into two:

- **Image `<Link>`** — wraps only the image box (`relative overflow-hidden bg-white aspect-square`, including the out-of-stock badge/overlay). Still navigates to the product page.
- **Info `<Link>`** — wraps the vendor/title/price block. Still navigates to the product page.

`<ShopifyQuickAddButton>` moves to be a **sibling of the image `<Link>`**, inside the same image box `<div>`, so `absolute bottom-2 right-2` resolves against the image's own bounds — not the card's. It is explicitly *not* nested inside an `<a>` tag: this avoids invalid nested-interactive-element markup and means clicks on the button never bubble to a navigation handler (no `stopPropagation` needed for that reason, though the existing `stopPropagation` in `handleOpen` can stay as a harmless no-op safeguard).

The outer card `<div>` keeps its `group relative` classes so `group-hover` still works from anywhere on the card.

### `ShopifyQuickAddButton.tsx` — classes only

Replace:
```
absolute top-2 right-2 z-10 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-navy-900 hover:text-white text-navy-900
```
with a mobile-first responsive version:
- Base (mobile, below `sm`): `opacity-100 scale-100` — always visible, same size/position, no hover required.
- `sm:` and up (desktop): `sm:opacity-0 sm:scale-90 sm:group-hover:opacity-100 sm:group-hover:scale-100` — hidden until the card is hovered, then fades and scales in.
- Transition covers both properties (`transition-[opacity,transform] duration-200 ease-out`) so the reveal reads as a smooth combined fade+scale, not a hard pop.
- Position becomes `bottom-2 right-2` (was `top-2 right-2`).

`sm` (640px) is the same breakpoint `ProductGrid` already uses for its `sm:grid-cols-2` split, so this stays consistent with the rest of the grid's responsive behavior.

## Testing

Add `components/store/__tests__/ShopifyProductCard.test.tsx` (new file, no existing test coverage for this component today):

- Button element is a DOM sibling of the image `<a>`, not a descendant — asserts the restructure landed correctly.
- Clicking the quick-add button does not trigger navigation (no click reaching the anchor's href handling).
- Button carries both the mobile-visible (`opacity-100`) and desktop-hover (`sm:opacity-0`, `sm:group-hover:opacity-100`) Tailwind classes.
- Vendor/title/price block and image both still link to the product's href (`/category/{slug}/{handle}` or `/product/{handle}`).
- Existing behavior preserved: quick-add button renders `null` when `!product.availableForSale`; clicking it still opens `QuickAddModal`.

## Acceptance criteria mapping

| Ticket criterion | How this design satisfies it |
|---|---|
| Desktop: button appears only on hover, animates smoothly | `sm:opacity-0`/`sm:group-hover:opacity-100` + scale transform + transition |
| Desktop: button stays in bottom-right corner | `bottom-2 right-2`, anchored to image box |
| Mobile: visible add action, no overlap | Permanently `opacity-100`, same bottom-right image-box position — never overlaps text since it's bounded to the image |
| Product-card click-through still works | Two `<Link>`s (image + info) preserve full click-through; button un-nested from anchor so it never intercepts navigation clicks |
