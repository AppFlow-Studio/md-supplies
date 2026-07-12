# DEV-02 — Vercel Setup Guide

Priority: P0 · Owner: Sardorbek · DNS handoff: Bilal

---

## Step 1 — Connect the repo

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import the `md-supplies` GitHub repository
3. In **Configure Project** set:

| Setting | Value |
|---|---|
| Framework Preset | Next.js (auto-detected) |
| Root Directory | `.` (leave blank — repo root) |
| Node.js Version | `22.x` |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `.next` (default) |

> **Do not click Deploy yet.** Set all environment variables first (Step 2).

---

## Step 2 — Environment variables

Go to **Project Settings → Environment Variables**.

Add each row below with the exact scopes shown. Server-only secrets must never appear in a `NEXT_PUBLIC_` variable.

| Variable | Production | Preview | Development | Notes |
|---|---|---|---|---|
| `SHOPIFY_STORE_DOMAIN` | ✅ | ✅ | ✅ | `daebb2-76.myshopify.com` |
| `SHOPIFY_STOREFRONT_ACCESS_TOKEN` | ✅ | ✅ | ✅ | Secret — from 1Password |
| `SHOPIFY_CUSTOMER_ACCOUNT_URL` | ✅ | ✅ | ✅ | `https://shopify.com/authentication/71167377624` |
| `SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID` | ✅ | ✅ | ✅ | `87bb2a4d-7725-4c9d-8494-84c908432f0f` |
| `NEXT_PUBLIC_SITE_URL` | ✅ | ✅ | — | **Production:** `https://mdsupplies.com` · **Preview:** see note below |
| `NEXT_PUBLIC_GTM_ID` | ✅ | — | — | `GTM-5BQJLLJV` — Production only; code already excludes it on staging |
| `RESEND_API_KEY` | ✅ | ✅ | — | Secret — from 1Password |
| `RESEND_FROM_EMAIL` | ✅ | ✅ | — | `noreply@mdsupplies.com` |
| `RESEND_TO_EMAIL` | ✅ | ✅ | — | `team@mdsupplies.com` |
| `RESEND_SOURCING_TO_EMAIL` | ✅ | ✅ | — | `sourcing@mdsupplies.com` |
| `BUNNYCDN_STORAGE_ACCESS_KEY` | ✅ | ✅ | ✅ | Secret — from 1Password |
| `BUNNYCDN_STORAGE_HOSTNAME` | ✅ | ✅ | ✅ | `ny.storage.bunnycdn.com` |
| `BUNNYCDN_STORAGE_ZONE` | ✅ | ✅ | ✅ | `md-supplies` |
| `NEXT_PUBLIC_IS_STAGING` | — | ✅ | — | `true` — Preview scope only, never Production |

### NEXT_PUBLIC_SITE_URL on Preview

After the first preview deployment lands, Vercel assigns a stable branch alias such as:

```
https://md-supplies-git-sardor-dev-<org>.vercel.app
```

1. Go to **Deployments → the preview deploy → Visit**, copy the root URL
2. Return to **Project Settings → Environment Variables**
3. Set that URL as the **Preview** value for `NEXT_PUBLIC_SITE_URL`
4. Register it in Shopify Admin → **Customer accounts → Callback URIs**:
   - Add `<preview-url>/api/auth/callback`
   - Add `<preview-url>/account` as a logout URI

---

## Step 3 — Password-protect Preview deployments

> Requires **Vercel Pro** plan. On Hobby, use Vercel Authentication instead (restricts access to logged-in Vercel team members).

### Pro plan

1. **Project Settings → Deployment Protection**
2. Enable **Password Protection** for **Preview** deployments
3. Set a strong password — share via 1Password, not Slack or chat
4. Leave Production unprotected

### Hobby plan (alternative)

1. **Project Settings → Deployment Protection**
2. Enable **Vercel Authentication** for Preview deployments

---

## Step 4 — Verify staging noindex

After the first preview deploy succeeds:

| Check | Expected result |
|---|---|
| `<preview-url>/robots.txt` | `Disallow: /` |
| Any page source → `<meta name="robots">` | `noindex,nofollow` |
| Any page source → GTM script | Absent |
| `<preview-url>/sitemap.xml` | Empty body (200, no URLs) |

All four are wired in code via `NEXT_PUBLIC_IS_STAGING=true` — no manual configuration needed beyond setting that env var.

---

## Step 5 — Attach the production domain

> **Do this only after Bilal confirms DNS is live.** Do not request registrar credentials in repo or chat.

1. **Project Settings → Domains → Add**
2. Add `mdsupplies.com` → mark as **primary domain**
3. Add `www.mdsupplies.com` → Vercel auto-configures a 301 redirect to non-www
4. Wait for the green SSL lock (usually under 5 minutes)
5. Verify:
   - `https://mdsupplies.com` loads correctly
   - `https://www.mdsupplies.com` 301s to `https://mdsupplies.com`

---

## DNS handoff for Bilal

> Apply these records in the `mdsupplies.com` DNS zone at the registrar. Do not share registrar credentials with anyone.
>
> **Verify the values in Vercel first** — go to Project Settings → Domains → the domain row → "Check Configuration". Use whatever Vercel shows; the records below are standard but Vercel's dashboard is authoritative.

| Type | Name | Value | TTL |
|---|---|---|---|
| `A` | `@` (root) | `76.76.21.21` | 300 |
| `CNAME` | `www` | `cname.vercel-dns.com.` | 300 |

### Cutover steps

1. Lower TTL to **60s** on the existing records; wait for propagation (~24 h)
2. Update the records to the Vercel values above
3. Wait for Vercel to issue the SSL certificate (Project Settings → Domains → green lock)
4. Confirm `https://mdsupplies.com` loads and `www` 301s

### Rollback

If anything breaks within 1 hour of cutover: point `@` back to the previous A record value. At TTL 60s, propagation is fast.

---

## Evidence checklist for Done

- [ ] Protected staging URL shared with team (password in 1Password)
- [ ] Staging URL returns `noindex` and empty sitemap
- [ ] Vercel build log screenshot (passing build)
- [ ] Env variable names screenshot in Vercel dashboard (values hidden)
- [ ] DNS handoff doc delivered to Bilal (this file, Step 5 section)
- [ ] Production build emits `https://mdsupplies.com` canonicals
