# Accessibility Audit Report (axe-core) — Track A Routes

**Date:** 2026-06-23
**Scope:** home, category, PDP, OCC, industry, blog, cart, account
**Tool:** `npx @axe-core/cli` against `localhost:3000` (`wcag2a`, `wcag2aa` tags)

## Automated scan results

| Route | Violations | Notes |
|---|---|---|
| `/` (home) | Pending | Fill in from `audit/axe/home.json` |
| `/category/[slug]` | Pending | Fill in from `audit/axe/category.json` |
| `/product/[slug]` | Pending | Fill in from `audit/axe/pdp.json` |
| `/solutions/occ` | Pending | Fill in from `audit/axe/occ.json` |
| `/industries/[slug]` | Pending | Fill in from `audit/axe/industry.json` |
| `/blog/[handle]` | Pending | Fill in from `audit/axe/blog.json` |
| `/cart` | Pending | Fill in from `audit/axe/cart.json` — note: this route is a placeholder ("Cart coming soon"); the real cart UI is the `CartPopup` slide-over reachable from any page's header, scan that interaction manually (see below). |
| `/account` | Pending | Fill in from `audit/axe/account.json` |

axe-core cannot drive the `CartPopup`/`QuickAddModal`/`FilterDrawer`/Header-mobile-menu open states from a static page load — those need either the committed Playwright+axe E2E suite (test-infrastructure plan) or the manual pass below.

## Manual keyboard navigation checklist

Run through each on a real keyboard, no mouse:

- [ ] Skip link: press Tab once on page load, "Skip to main content" appears, Enter jumps focus into `<main id="main-content">`.
- [ ] Header: Tab reaches Categories/nav links, Enter/Space opens dropdowns, Escape closes them, focus doesn't get trapped.
- [ ] Mobile menu (resize <768px): hamburger button opens the drawer, Tab cycles through its links, closing returns focus to the hamburger.
- [ ] Search overlay: opening it focuses the input, Escape closes it.
- [ ] Cart panel: open via header cart icon, focus lands inside, Tab/Shift+Tab cycles only within the panel, Escape closes it, and with it closed the panel's buttons are unreachable by Tab (see Task 4).
- [ ] Filter drawer (mobile category page): same focus-trap/Escape checks as cart.
- [ ] Quick add modal (product card hover/click): focus-trap/Escape checks (already implemented pre-ticket — verify still holds).
- [ ] PDP gallery thumbnails: each thumbnail is reachable and selectable via Tab + Enter/Space.
- [ ] FAQ accordion (industry pages): Tab reaches each question, Enter/Space toggles, `aria-expanded` updates.
- [ ] Forms (contact, account login/orders): every field has a visible focus ring (`:focus-visible` teal outline) and a programmatic label.

## Manual screen reader spot-check (at least one of NVDA/VoiceOver/JAWS)

- [ ] Home: landmark navigation announces header, main, footer; H1 announced once.
- [ ] PDP: product title, price, and Add to Cart button are announced clearly; quantity stepper buttons announce "Decrease quantity"/"Increase quantity".
- [ ] Cart panel: opening it is announced (consider adding `aria-live` confirmation on add-to-cart in a follow-up if not already present); line items are announced with product name, quantity, and price.
- [ ] Account: logged-out vs. logged-in states are distinguishable by a screen reader user (form fields labeled, no orphaned buttons).

**This checklist requires a human with a screen reader to execute — flag remaining unchecked items back to Sardorbek before launch sign-off.**
