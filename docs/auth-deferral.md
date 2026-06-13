# Auth Feature Deferral — T1 Customer Account

**Date:** 2026-06-13  
**Ticket:** T1 Customer Account  
**Owner:** Izzy

---

## What Ships at Launch

### Fully built and verified (code review)

| Feature | Implementation |
|---|---|
| PKCE login initiation | `/api/auth/login` — generates verifier/challenge/state, redirects to Shopify hosted UI |
| OAuth callback + token exchange | `/api/auth/callback` — validates state, exchanges code, stores httpOnly session cookies |
| Session reading | `lib/shopify/session.ts:getSession()` — reads 3 cookies, returns null if any missing |
| Token refresh (60s pre-expiry) | `/api/auth/refresh` — refreshes access token, updates all session cookies |
| Logout | `/api/auth/logout` — deletes all 3 session cookies, redirects to `/account` |
| Account dashboard (read-only) | `/account` — fetches customer profile, last 10 orders, up to 20 addresses |
| Order history page | `/account/orders` — fetches last 50 orders, renders status/date/total table |
| Logged-out fallback | `/account` with no session — renders `LoggedOutView` with Log In / Create Account CTAs |
| Private route noindex | All account routes: `robots: { index: false, follow: false }` + `robots.txt` disallows |

### Interim state for customers

Logged-out users see the full marketing account page with Log In / Create Account. Logged-in users see a read-only dashboard: profile info, order history table, saved address list. No mutations are possible — all edit/add/remove UI is visible but non-functional.

---

## What Is Deferred

### Address management (add / edit / remove)

**Current state:** `AccountView.tsx` renders "Add New", "Edit", and "Remove" buttons. These have no event handlers — they are display-only shells.

**What's needed to ship:** Shopify Customer Account API address mutations (`customerAddressCreate`, `customerAddressUpdate`, `customerAddressDelete`), a form modal or inline form, and a Server Action or API route to execute the mutation.

**Post-launch plan:** Build as a standalone P2 ticket after GA.

---

### Account settings editing (name, email, phone, password)

**Current state:** `AccountView.tsx` account settings section renders "Edit" buttons next to each field. No handlers.

**What's needed to ship:** `customerUpdate` mutation via Customer Account API, form UI, Server Action.

**Post-launch plan:** P2, paired with address management.

---

### Order detail page (`/account/orders/[number]`)

**Current state:** "View Details" links in both `AccountView` and `AccountOrdersPage` point to `/account/orders/${order.number}`. This route **does not exist** — it 404s.

**What's needed to ship:** `app/(noindex)/account/orders/[number]/page.tsx` using `GET_ORDER` query (already written in `lib/shopify/queries/customer.ts`).

**Interim:** The 404 is live for logged-in customers who click "View Details". This is a visible gap. Recommend either:
- (a) Build the detail page — estimated 1–2 hours, query is already written
- (b) Remove "View Details" links from both pages before launch

**Post-launch plan:** If deferred, ship as P1 immediately after GA since it's the primary order tracking flow.

---

### Invoice download / PDF

**Current state:** "Invoices" stat in the dashboard shows "—". No invoice data is fetched.

**Rationale for deferral:** Shopify's Customer Account API does not expose invoice PDFs. Generating them requires a custom solution (Shopify metafields + a PDF service, or a third-party app).

**Post-launch plan:** Evaluate Shopify invoice apps or a custom PDF generation service. P3.

---

### B2B company account management

**Current state:** `/b2b` exists as a noindexed duplicate of the account page — it was an earlier routing experiment and should be deleted. B2B-specific account features (company profiles, Net 30 terms UI, approval workflows) are not built.

**Rationale for deferral:** Shopify's B2B Company Account API requires the B2B or Plus plan. The current Shopify plan does not include this API. Even with access, the UI and approval workflow are significant scope.

**Interim state:** B2B customers log in via the same PKCE flow and see the standard account dashboard. No company-specific data is shown.

**Post-launch plan:** Once Shopify plan is confirmed and B2B Company Account API is accessible, scope as a separate sprint. P2 business priority.

---

### Subscription management UI

**Current state:** Not built. No subscription data is fetched.

**Rationale for deferral:** Subscriptions require a third-party app (Recharge, Loop, Skio) or Shopify Subscriptions. No app is selected yet.

**Post-launch plan:** Pending app selection. P3.

---

## Stale Code to Clean Up

- `app/b2b/page.tsx` — near-identical duplicate of `app/(noindex)/account/page.tsx`. Should be deleted. It is noindexed and blocked in `robots.txt` so no SEO risk, but it's dead weight. Delete as part of the next cleanup PR.

---

## Launch Acceptance

- [x] Login flow is implemented (PKCE code: complete)
- [x] Logged-out `/account` shows clean marketing shell, not an error
- [x] All private routes are noindexed and `robots.txt`-blocked
- [ ] **Manual E2E test required:** Complete PKCE flow with a test customer that has orders (cannot be automated — requires browser + Shopify hosted form)
- [ ] **Manual token refresh test required:** Manipulate `shopify_token_expires_at` cookie to verify refresh trigger
- [ ] **Decision needed:** Ship `/account/orders/[number]` at launch or remove "View Details" links
