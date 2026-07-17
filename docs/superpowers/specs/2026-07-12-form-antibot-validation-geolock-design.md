# Form anti-bot hardening, real email/phone validation & US/CA geo-lock — design

**Date:** 2026-07-12
**Scope:** `app/contact/ContactForm.tsx` (`POST /api/contact`) and `components/home/WholesalePricing.tsx` (`POST /api/sourcing`) — the only two forms in the codebase that collect name/email/phone. Search forms (`SearchBarForm`, `SearchDropdown`) are out of scope; they don't collect PII and aren't a spam target in the same way.

**Builds on:** DEV-21 (`docs/superpowers/specs/2026-06-26-form-validation-abuse-protection-design.md`), which already gave both routes a shared Zod schema, honeypot, origin check, body-size cap, and header-injection sanitization. This design adds a second, stronger layer on top of that pipeline — it does not replace it.

## Problem

The existing hardening (honeypot + origin check + format-only regex/`z.email()`) stops naive bots and CSRF-style abuse, but:

1. A scripted bot that fills every visible field (including a slow, deliberate fill) defeats the honeypot.
2. Email/phone are only checked for *shape*, not whether they're real — `nobody@thisdomainhasnomailserver.test` and `123` both currently pass.
3. The business only serves the US and Canada; nothing stops submissions from anywhere else, and nothing tells a non-US/CA visitor why.

## Goals

- Add a stateless anti-bot signal beyond the honeypot, with no new persistent store.
- Verify email domains can actually receive mail, and phone numbers are real, dialable North American numbers.
- Reject form submissions from outside the US/Canada with a clear, user-facing message.
- Apply identically to both forms via the shared modules they already import from.

## Non-goals

- **No in-app rate limiting / per-IP request cap.** `lib/forms/guards.ts` and the DEV-21 doc explicitly park durable rate limiting at the Vercel WAF layer and rule out a process-local `Map` (weak guarantee — doesn't share state across serverless instances, resets on cold start). This design does not revisit that decision.
- **No CAPTCHA widget** (Cloudflare Turnstile, reCAPTCHA, etc.) — the invisible time-trap was chosen over added user friction and third-party script/key setup.
- **No paid email-verification API** (deliverability/mailbox-existence/disposable-domain checks) — DNS MX/A lookup is free and sufficient for this stage.
- **No geo-lock on page rendering.** The forms stay visible to everyone; only the submit is blocked for non-US/CA visitors. (No hide-the-form-at-render-time variant.)

## Architecture

```
client form ──POST JSON──▶ route handler
                            │
                            ├─ assertAllowedOrigin(req)          → 403
                            ├─ assertAllowedCountry(req)         → 403 {error: user-facing geo message}
                            ├─ readJsonBounded(req, 16KB)        → 413 / 400
                            ├─ isHoneypotFilled(body)            → 200 {ok:true} (silent drop)
                            ├─ isSubmittedTooFast(body)          → 200 {ok:true} (silent drop)
                            ├─ schema.safeParseAsync(body)       → 400 {error, fields}
                            │     ├─ email: format + MX/A refine
                            │     └─ phone: NANP validity refine
                            ├─ sanitizeHeaderValue(...)
                            └─ getResend().emails.send(...)      → 502 on failure / 200
```

Bot signals (honeypot, time-trap) stay **silent** — same 200 response as success, so scripted clients can't distinguish a drop from a real send. Policy rejections (origin, country, validation) stay **explicit** with a real error status and message, matching the existing origin-check precedent.

### 1. Time-trap (anti-bot, stateless)

Both forms already `useState`-track their fields; add one more piece of state captured once at mount:

```ts
const mountedAt = useRef(Date.now())
```

On submit, compute `elapsedMs = Date.now() - mountedAt.current` and include it in the POST payload. `lib/forms/schema.ts` gains it as a new field on `baseFields`:

```ts
elapsedMs: z.number().optional(),
```

New guard in `lib/forms/guards.ts`:

```ts
const MIN_FILL_MS = 1200

export function isSubmittedTooFast(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return true
  const elapsedMs = (data as Record<string, unknown>).elapsedMs
  return typeof elapsedMs !== 'number' || elapsedMs < MIN_FILL_MS
}
```

Checked in both routes right after the honeypot check, same silent-200 treatment. No human fills a multi-field required form in under ~1.2s; this catches bots that skip the honeypot but submit instantly.

**Risk:** a small false-positive chance for an unrealistically fast human (e.g. browser autofill + immediate click). Considered acceptable given the 1.2s floor and that the failure mode is silent (the user just sees the generic success/no visible error — no dead end, no confusing rejection).

### 2. Real email validation (MX/A-record check)

New `lib/forms/verify-email.ts`:

```ts
import { resolveMx, resolve4, resolve6 } from 'node:dns/promises'

const LOOKUP_TIMEOUT_MS = 3000

async function withTimeout<T>(p: Promise<T>): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), LOOKUP_TIMEOUT_MS)),
  ])
}

/**
 * True if the email's domain can plausibly receive mail: has MX records, or
 * (per RFC 5321 fallback) an A/AAAA record if MX is absent. DNS errors other
 * than "no records" (timeouts, resolver failures) fail OPEN — a transient DNS
 * hiccup must never block a real customer.
 */
export async function hasValidMxRecord(email: string): Promise<boolean> {
  const domain = email.split('@')[1]
  if (!domain) return false

  try {
    const mx = await withTimeout(resolveMx(domain))
    if (mx === null) return true // timeout — fail open
    if (mx.length > 0) return true
  } catch (err) {
    if (!isNoRecordsError(err)) return true // resolver/network error — fail open
  }

  try {
    const [a, aaaa] = await Promise.all([
      withTimeout(resolve4(domain)).catch(() => []),
      withTimeout(resolve6(domain)).catch(() => []),
    ])
    return (a?.length ?? 0) > 0 || (aaaa?.length ?? 0) > 0
  } catch {
    return true // fail open on unexpected errors
  }
}

function isNoRecordsError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException)?.code
  return code === 'ENOTFOUND' || code === 'ENODATA'
}
```

Wired into `lib/forms/schema.ts` as an async refine on `email`, which means both routes switch from `schema.safeParse` to `schema.safeParseAsync`.

### 3. Real phone validation (NANP)

New dependency: `libphonenumber-js`. New `lib/forms/phone.ts`:

```ts
import { parsePhoneNumberFromString } from 'libphonenumber-js'

const NANP_COUNTRIES = new Set(['US', 'CA'])

/** True for an empty/absent phone (still optional) or a real US/Canadian number. */
export function isValidNanpPhone(phone: string): boolean {
  if (!phone.trim()) return true
  const parsed = parsePhoneNumberFromString(phone, { defaultCountry: 'US' })
  return !!parsed && parsed.isValid() && NANP_COUNTRIES.has(parsed.country ?? '')
}
```

Replaces the current permissive regex-only check on `phone` in `baseFields` with a `.refine(isValidNanpPhone, 'Enter a valid US or Canadian phone number')`. Sync — no `safeParseAsync` requirement on its own, but it now runs inside the same async schema as the email check.

### 4. US/Canada geo-lock

New guard in `lib/forms/guards.ts`:

```ts
const ALLOWED_COUNTRIES = new Set(['US', 'CA'])

/**
 * Vercel's edge network sets `x-vercel-ip-country` on every request; this is
 * the correct mechanism post-Next 15 (the old `NextRequest.geo`/`.ip` were
 * removed in v15). Absent outside Vercel (local dev, other hosts) — the check
 * is skipped rather than blocking, since there's no signal to act on.
 */
export function assertAllowedCountry(req: Request): Allowed {
  const country = req.headers.get('x-vercel-ip-country')
  if (country && !ALLOWED_COUNTRIES.has(country)) return { ok: false, status: 403 }
  return { ok: true }
}
```

Route handlers return a distinct, user-facing message for this case (unlike the generic "Forbidden origin" body):

```ts
const country = assertAllowedCountry(req)
if (!country.ok) {
  return NextResponse.json(
    { error: 'This form is only available to customers in the United States and Canada.' },
    { status: 403 },
  )
}
```

### 5. Client changes (both forms)

- Add `mountedAt` ref and `elapsedMs` in the POST payload (section 1).
- Surface the server's real `error` message instead of a hardcoded generic string when `fields` is absent:

  ```ts
  setServerError(result.error ?? 'Something went wrong. Please try again or email us directly.')
  ```

  This is what actually gets the geo-lock message (and any other future explicit `error` string) in front of the user — today that text is silently discarded.

## Testing (vitest, extends `lib/forms/__tests__`)

| Case | Where | Expectation |
| --- | --- | --- |
| `elapsedMs` below threshold | guards/route | 200, no send |
| `elapsedMs` missing | guards/route | 200, no send |
| `elapsedMs` above threshold, everything else valid | route | 200, send called |
| Country header = `US`/`CA` | guards/route | passes |
| Country header = other (e.g. `RU`) | guards/route | 403 + geo message |
| Country header absent | guards/route | passes (no signal) |
| Email domain has MX records | verify-email | valid |
| Email domain has no MX but has A record | verify-email | valid (fallback) |
| Email domain has neither | verify-email | invalid |
| DNS lookup throws/times out | verify-email | valid (fail open) |
| Phone = valid US number | phone | valid |
| Phone = valid CA number | phone | valid |
| Phone = too short / fake area code | phone | invalid |
| Phone = empty string | phone | valid (still optional) |
| Route tests | contact/sourcing | updated for `safeParseAsync`, DNS mocked |
| Client: server error text shown verbatim | ContactForm/WholesalePricing test | `serverError` reflects `result.error` |

DNS-dependent tests mock `node:dns/promises` (`vi.mock`) rather than hitting real DNS, matching how the existing route tests mock `getResend()`.

## New dependencies / env

- **Dep:** `libphonenumber-js`.
- **Env:** none. `x-vercel-ip-country` requires no configuration — it's set automatically by the Vercel edge network in any deployed environment.

## Risks

- **Time-trap false positive:** an unrealistically fast legitimate submission is silently treated as a drop (no error shown, no email sent). Mitigated by the threshold being conservative (1.2s) relative to how long a required multi-field form actually takes to fill.
- **MX/A check fail-open:** a domain that's genuinely dead but happens to trip a transient DNS error path is *not* caught. Accepted trade-off — fail-closed would risk blocking real customers on unrelated DNS flakiness, which is worse for a P0 conversion path (wholesale sourcing leads) than occasionally accepting a dead address.
- **Geo-lock only enforces on Vercel:** local dev and any future non-Vercel host see no geo restriction. Acceptable since this mirrors how the origin check and WAF rate limiter are already documented as Vercel-dependent defense-in-depth, not universal guarantees.
- **NANP phone validation is North-America-only by design** — matches the geo-lock scope; if the business ever serves other regions, both this and the geo-lock would need revisiting together.

## Acceptance criteria

- [ ] Both forms send `elapsedMs`; both routes silently drop fast/missing submissions.
- [ ] Both routes reject non-US/CA `x-vercel-ip-country` with a 403 and the geo message; absent header passes through.
- [ ] Both routes validate email via MX/A lookup (fail-open on DNS errors) before sending.
- [ ] Both routes validate phone as a real NANP number when non-empty.
- [ ] Client forms display the server's actual `error` text instead of a hardcoded generic string.
- [ ] All new logic covered by vitest tests; existing DEV-21 test suite still passes.
- [ ] No new PII in logs or analytics (unchanged from DEV-21 — this design adds no new logging).
