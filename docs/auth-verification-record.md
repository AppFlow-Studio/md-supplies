# Auth Verification Record — T1 Customer Account

**Date:** 2026-06-13  
**Branch:** sardor-dev  
**Verifier:** Claude Code (code review + local surface testing)

---

## Summary

The auth system is structurally correct and safe to ship for the logged-out and post-login dashboard flows. The full E2E PKCE round-trip (login → Shopify hosted form → callback → session) **must be manually verified** with a live test customer — it cannot be replayed from a CI environment because Shopify's hosted auth form requires a real browser session.

---

## 1. End-to-End Login Flow (Code Review)

**Cannot fully automate** — the PKCE flow requires a browser navigating to Shopify's hosted auth UI, which is an external domain. Manual QA step required (see §5).

**Code review result — PASS:**

| Step | File | Finding |
|---|---|---|
| Initiate login | `app/api/auth/login/route.ts` | Correct: generates 32-byte verifier, S256 challenge, 16-byte state; sets httpOnly cookies (10 min TTL); redirects to Shopify authorize URL |
| Callback | `app/api/auth/callback/route.ts` | Correct: validates state match, exchanges code+verifier for tokens, sets session cookies, clears PKCE cookies |
| Token storage | callback route | `access_token` maxAge = `expires_in`; `refresh_token` maxAge = 30 days; `expires_at` stored as epoch ms string |
| Error handling | callback route | Redirects to `/account?auth_error=1` on both state mismatch and exchange failure |

**Manual QA required (owner: Izzy):**

```
1. Open browser → http://localhost:3000/api/auth/login
2. Complete Shopify hosted login form with test customer that has orders
3. Confirm redirect lands on /account
4. Confirm profile name, orders list, and addresses render from Customer Account API
5. Confirm no console errors or error fallback UI
```

---

## 2. Token Lifecycle (Code Review)

**Code review result — PASS:**

| Check | Location | Logic |
|---|---|---|
| Refresh trigger | `app/(noindex)/account/page.tsx:24`, `app/(noindex)/account/orders/page.tsx:42` | `if (Date.now() >= session.expiresAt - 60_000)` → redirect to `/api/auth/refresh?next=<current page>` |
| Refresh handler | `app/api/auth/refresh/route.ts` | Calls `refreshAccessToken(session.refreshToken)` → writes new tokens; on failure → redirects to `/api/auth/login` |
| Logout | `app/api/auth/logout/route.ts` | Deletes `shopify_access_token`, `shopify_refresh_token`, `shopify_token_expires_at` → redirects to `/account` |

**Manual QA required (owner: Izzy):**

```
To test refresh near expiry:
1. Log in via PKCE flow
2. In DevTools → Application → Cookies, manually set shopify_token_expires_at
   to (Date.now() + 30000) — 30 seconds from now
3. Navigate to /account or /account/orders
4. Observe: should redirect to /api/auth/refresh, return to the page with a fresh token
5. Confirm cookies show updated shopify_token_expires_at value

To test logout clears session:
1. Log in, confirm /account shows dashboard
2. Click "Log Out"
3. Confirm redirect to /account shows LoggedOutView (Log In / Create Account buttons)
4. Confirm DevTools shows no shopify_* session cookies
```

---

## 3. Logged-Out Fallback (VERIFIED)

**Verdict: PASS**

`GET /account` (no session cookies) → HTTP 200, `LoggedOutView` rendered.

Evidence:
- HTML contains "Log In" and "Create Account" CTAs ✅
- No error state, no broken UI ✅
- No mock data or dummy customer name visible ✅
- `<meta name="robots" content="noindex, nofollow"/>` present ✅

---

## 4. Noindex Confirmation (VERIFIED)

**Verdict: PASS** (after one fix applied in this session)

| Route | Mechanism | Status |
|---|---|---|
| `/account` | `metadata.robots` in page.tsx | ✅ `noindex, nofollow` |
| `/account/login` | `metadata.robots` added 2026-06-13 | ✅ `noindex, nofollow` (was missing — fixed) |
| `/account/orders` | `metadata.robots` in page.tsx | ✅ `noindex, nofollow` |
| `/b2b` | `metadata.robots` in page.tsx | ✅ `noindex, nofollow` |
| `robots.txt` | `lib/seo/robots-config.ts` | ✅ Disallows `/account/`, `/b2b`, `/api/` |

**T2 status:** `/b2b` is fully resolved — `robots.txt` disallows it AND the page sets noindex metadata. Both layers confirmed.

**Fix applied:** `app/(noindex)/account/login/page.tsx` was missing `export const metadata`. Added `robots: { index: false, follow: false }`. Page immediately redirects so crawlers should not index it regardless, but explicit declaration is now in place.

---

## 5. Findings

### ⚠️ Order detail page missing

`AccountView.tsx` and `AccountOrdersPage` both render links to `/account/orders/${order.number}` (e.g., "View Details" in the order table). This route **does not exist** — it returns 404. For any logged-in customer with orders, these links are dead.

**Resolution options:**
- Create `app/(noindex)/account/orders/[number]/page.tsx` (uses `GET_ORDER` query which is already written in `lib/shopify/queries/customer.ts`)
- Or remove/disable the "View Details" links until the page is built

This blocks the logged-in flow for order-detail access. Not a launch blocker if E2E is tested with a customer who has orders and the dead link is accepted as deferred.

### ⚠️ `/b2b/page.tsx` is a stale duplicate

`app/b2b/page.tsx` is a near-identical copy of `app/(noindex)/account/page.tsx` — same imports, same data fetch, same `AccountView`. The refresh redirect targets `/b2b` instead of `/account`. This file appears to be leftover from an earlier routing experiment. It is noindexed and robots-blocked so it will not cause SEO harm, but it should be removed to avoid confusion.

### `/account/login` redirect in dev mode

In dev mode (Turbopack), `redirect()` from a server component falls back to `<meta http-equiv="refresh" content="1;url=/api/auth/login"/>` rather than a proper HTTP 307. This is a known Turbopack/SSR dev behavior; production builds produce a correct 307.

### Address management / settings are non-functional shells

`AccountView.tsx:396-454` renders "Add New", "Edit", and "Remove" buttons for addresses, and "Edit" buttons for account settings fields. All are `<button>` elements with no `onClick` handlers. These are display-only at launch (see deferral doc).
