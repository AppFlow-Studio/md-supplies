# Form Anti-Bot, Real Validation & US/CA Geo-Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden `app/contact/ContactForm.tsx` and `components/home/WholesalePricing.tsx` (and their `/api/contact` / `/api/sourcing` routes) with a stateless anti-bot time-trap, real MX/A-record email validation, real NANP phone validation, and a US/Canada geo-lock.

**Architecture:** Everything is added to the shared `lib/forms/` modules both routes already import (`schema.ts`, `guards.ts`), so both forms get every protection identically with no per-form duplication. Two new stateless leaf modules (`lib/forms/phone.ts`, `lib/forms/verify-email.ts`) hold the actual validation logic; `schema.ts` wires them in as Zod refinements; `guards.ts` gains two new request-level checks; the two route handlers gain one new pipeline step each and switch from `safeParse` to `safeParseAsync`; the two client components gain a submit-timing field and start surfacing the server's real error text.

**Tech Stack:** Next.js 16 App Router route handlers, Zod v4, `libphonenumber-js` (new dependency), Node's built-in `dns/promises`, Vitest + Testing Library.

## Global Constraints

- **No new in-app rate limiting / process-local store.** DEV-21 (`docs/superpowers/specs/2026-06-26-form-validation-abuse-protection-design.md`) explicitly rules out a process-local `Map`; the durable per-IP limiter stays at the Vercel WAF layer. Nothing in this plan adds request counting/storage.
- **Exactly one new dependency:** `libphonenumber-js`. Email verification uses Node's built-in `dns/promises` — no new dependency for that.
- **No CAPTCHA widget, no paid email-verification API.**
- **Geo-lock uses only** the `x-vercel-ip-country` request header (set automatically by Vercel's edge network). If the header is absent (local dev, non-Vercel host), the check is skipped, not enforced as a block.
- **Time-trap threshold:** submissions with `elapsedMs < 1200` (or missing `elapsedMs`) are treated as bots.
- **DNS lookup timeout:** 3000ms per lookup. Any DNS error other than a confirmed "no records" (`ENOTFOUND`/`ENODATA`) — including timeouts — fails OPEN (submission allowed). Only a domain with zero MX, zero A, and zero AAAA records is rejected.
- **Response contract:** bot signals (honeypot, time-trap) return a **silent `200 {ok:true}`** without sending, exactly like the existing honeypot. Policy/validation rejections (origin, country, schema) return an **explicit error status with a real `error` message**.
- **No new PII in logs or analytics.** Unchanged from DEV-21 — this plan adds no new `console.log`/`track()` call sites beyond what already exists.
- **`+1 (555) 000-0000`, used as a placeholder and test fixture today, is not a real NANP number** (555 is not an assigned area code) and will be rejected by the new phone validation. Every task below that touches a phone fixture/placeholder replaces it with `+1 (212) 555-0100` (a real area code using the industry-reserved-for-fiction `555-01XX` exchange, which validates as a real number).

---

### Task 1: NANP phone validation (`lib/forms/phone.ts`)

**Files:**
- Create: `lib/forms/phone.ts`
- Test: `lib/forms/__tests__/phone.test.ts`
- Modify: `package.json` (add `libphonenumber-js` dependency)

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces: `isValidNanpPhone(phone: string): boolean` — used by Task 4 (`lib/forms/schema.ts`).

- [ ] **Step 1: Install the dependency**

Run: `npm install libphonenumber-js`
Expected: `package.json` gains a `"libphonenumber-js": "^1.13.8"` (or newer patch) entry under `dependencies`.

- [ ] **Step 2: Write the failing test**

Create `lib/forms/__tests__/phone.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { isValidNanpPhone } from '@/lib/forms/phone'

describe('isValidNanpPhone', () => {
  it('accepts a real US number', () => {
    expect(isValidNanpPhone('+1 (212) 555-0100')).toBe(true)
  })

  it('accepts a real Canadian number', () => {
    expect(isValidNanpPhone('+1 (416) 555-0199')).toBe(true)
  })

  it('accepts a US number without a leading +1', () => {
    expect(isValidNanpPhone('(212) 555-0100')).toBe(true)
  })

  it('rejects a fake area code', () => {
    expect(isValidNanpPhone('+1 (555) 000-0000')).toBe(false)
  })

  it('rejects a too-short number', () => {
    expect(isValidNanpPhone('555-1234')).toBe(false)
  })

  it('rejects an unparseable string', () => {
    expect(isValidNanpPhone('not a phone number')).toBe(false)
  })

  it('rejects a non-NANP international number', () => {
    expect(isValidNanpPhone('+44 20 7946 0958')).toBe(false)
  })

  it('accepts an empty string (still optional)', () => {
    expect(isValidNanpPhone('')).toBe(true)
  })

  it('accepts a whitespace-only string as empty', () => {
    expect(isValidNanpPhone('   ')).toBe(true)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/forms/__tests__/phone.test.ts`
Expected: FAIL — `Cannot find module '@/lib/forms/phone'` (or similar resolution error).

- [ ] **Step 4: Write the implementation**

Create `lib/forms/phone.ts`:

```ts
import { parsePhoneNumberFromString } from 'libphonenumber-js'

const NANP_COUNTRIES = new Set(['US', 'CA'])

/**
 * True for an empty/absent phone (still optional) or a real, dialable
 * US/Canadian (NANP) number — not just something that matches a digit regex.
 */
export function isValidNanpPhone(phone: string): boolean {
  if (!phone.trim()) return true
  const parsed = parsePhoneNumberFromString(phone, { defaultCountry: 'US' })
  return !!parsed && parsed.isValid() && NANP_COUNTRIES.has(parsed.country ?? '')
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/forms/__tests__/phone.test.ts`
Expected: PASS — 9 tests passing.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/forms/phone.ts lib/forms/__tests__/phone.test.ts
git commit -m "Add real NANP phone number validation"
```

---

### Task 2: Real email domain validation (`lib/forms/verify-email.ts`)

**Files:**
- Create: `lib/forms/verify-email.ts`
- Test: `lib/forms/__tests__/verify-email.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module; uses Node's built-in `node:dns/promises`).
- Produces: `hasValidMxRecord(email: string): Promise<boolean>` — used by Task 4 (`lib/forms/schema.ts`).

- [ ] **Step 1: Write the failing test**

Create `lib/forms/__tests__/verify-email.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const resolveMx = vi.fn()
const resolve4 = vi.fn()
const resolve6 = vi.fn()

vi.mock('node:dns/promises', () => ({
  resolveMx: (...args: unknown[]) => resolveMx(...args),
  resolve4: (...args: unknown[]) => resolve4(...args),
  resolve6: (...args: unknown[]) => resolve6(...args),
}))

import { hasValidMxRecord } from '@/lib/forms/verify-email'

function enotfound() {
  return Object.assign(new Error('not found'), { code: 'ENOTFOUND' })
}

beforeEach(() => {
  resolveMx.mockReset()
  resolve4.mockReset()
  resolve6.mockReset()
})

describe('hasValidMxRecord', () => {
  it('is true when the domain has MX records', async () => {
    resolveMx.mockResolvedValue([{ exchange: 'mx.clinic.com', priority: 10 }])
    expect(await hasValidMxRecord('jane@clinic.com')).toBe(true)
    expect(resolve4).not.toHaveBeenCalled()
  })

  it('is true when MX is absent but an A record exists (RFC 5321 fallback)', async () => {
    resolveMx.mockRejectedValue(enotfound())
    resolve4.mockResolvedValue(['203.0.113.10'])
    resolve6.mockRejectedValue(enotfound())
    expect(await hasValidMxRecord('jane@clinic.com')).toBe(true)
  })

  it('is true when MX is absent but an AAAA record exists', async () => {
    resolveMx.mockRejectedValue(enotfound())
    resolve4.mockRejectedValue(enotfound())
    resolve6.mockResolvedValue(['2001:db8::1'])
    expect(await hasValidMxRecord('jane@clinic.com')).toBe(true)
  })

  it('treats a lone null-MX record (RFC 7505) as no MX and falls back to A', async () => {
    resolveMx.mockResolvedValue([{ exchange: '', priority: 0 }])
    resolve4.mockResolvedValue(['203.0.113.10'])
    resolve6.mockRejectedValue(enotfound())
    expect(await hasValidMxRecord('jane@example.com')).toBe(true)
  })

  it('is false when MX, A, and AAAA are all confirmed absent', async () => {
    resolveMx.mockRejectedValue(enotfound())
    resolve4.mockRejectedValue(enotfound())
    resolve6.mockRejectedValue(enotfound())
    expect(await hasValidMxRecord('jane@thisdomaindoesnotexist.test')).toBe(false)
  })

  it('fails open on an MX lookup timeout', async () => {
    vi.useFakeTimers()
    resolveMx.mockImplementation(() => new Promise(() => {}))
    const resultPromise = hasValidMxRecord('jane@slow-dns.test')
    await vi.advanceTimersByTimeAsync(3000)
    expect(await resultPromise).toBe(true)
    vi.useRealTimers()
  })

  it('fails open on a non-"no records" DNS error (e.g. SERVFAIL)', async () => {
    const err = Object.assign(new Error('server failure'), { code: 'ESERVFAIL' })
    resolveMx.mockRejectedValue(err)
    resolve4.mockRejectedValue(err)
    resolve6.mockRejectedValue(err)
    expect(await hasValidMxRecord('jane@flaky-dns.test')).toBe(true)
  })

  it('is false for a malformed email with no domain part', async () => {
    expect(await hasValidMxRecord('not-an-email')).toBe(false)
    expect(resolveMx).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/forms/__tests__/verify-email.test.ts`
Expected: FAIL — `Cannot find module '@/lib/forms/verify-email'`.

- [ ] **Step 3: Write the implementation**

Create `lib/forms/verify-email.ts`:

```ts
import { resolveMx, resolve4, resolve6 } from 'node:dns/promises'

const LOOKUP_TIMEOUT_MS = 3000

type LookupOutcome<T> = T[] | 'timeout' | 'no-records' | 'error'

function isNoRecordsError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException)?.code
  return code === 'ENOTFOUND' || code === 'ENODATA'
}

async function lookup<T>(promise: Promise<T[]>): Promise<LookupOutcome<T>> {
  try {
    return await Promise.race([
      promise,
      new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), LOOKUP_TIMEOUT_MS)),
    ])
  } catch (err) {
    return isNoRecordsError(err) ? 'no-records' : 'error'
  }
}

function isInconclusive(outcome: LookupOutcome<unknown>): boolean {
  return outcome === 'timeout' || outcome === 'error'
}

/**
 * True if the email's domain can plausibly receive mail: it has a real MX
 * record, or (per RFC 5321 fallback) an A/AAAA record when MX is absent. A
 * lone "null MX" record (RFC 7505 — explicit "no mail here") does not count
 * as a real MX record and falls through to the A/AAAA check.
 *
 * DNS errors other than a confirmed "no records" (timeouts, resolver
 * failures) fail OPEN — a transient DNS hiccup must never block a real
 * customer. Only returns false when MX, A, and AAAA are all definitively
 * absent.
 */
export async function hasValidMxRecord(email: string): Promise<boolean> {
  const domain = email.split('@')[1]
  if (!domain) return false

  const mx = await lookup(resolveMx(domain))
  if (isInconclusive(mx)) return true
  if (mx !== 'no-records' && mx.some((record) => record.exchange && record.exchange !== '.')) {
    return true
  }

  const [a, aaaa] = await Promise.all([lookup(resolve4(domain)), lookup(resolve6(domain))])
  if (isInconclusive(a) || isInconclusive(aaaa)) return true

  const aRecords = a === 'no-records' ? [] : a
  const aaaaRecords = aaaa === 'no-records' ? [] : aaaa
  return aRecords.length > 0 || aaaaRecords.length > 0
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/forms/__tests__/verify-email.test.ts`
Expected: PASS — 8 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/forms/verify-email.ts lib/forms/__tests__/verify-email.test.ts
git commit -m "Add MX/A-record email domain verification with fail-open DNS handling"
```

---

### Task 3: Time-trap and geo-lock guards (`lib/forms/guards.ts`)

**Files:**
- Modify: `lib/forms/guards.ts:1-61` (docstring + insertion after `assertNoForeignOrigin`), `lib/forms/guards.ts:94-103` (insertion after `isHoneypotFilled`)
- Test: `lib/forms/__tests__/guards.test.ts` (extend existing file)

**Interfaces:**
- Consumes: nothing new (uses the existing `Allowed` type already defined in this file).
- Produces: `isSubmittedTooFast(data: unknown): boolean` and `assertAllowedCountry(req: Request): Allowed` — both used by Task 5 and Task 6 (route handlers).

- [ ] **Step 1: Write the failing tests**

In `lib/forms/__tests__/guards.test.ts`, extend the import list at the top:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'
import {
  assertAllowedOrigin,
  assertNoForeignOrigin,
  assertAllowedCountry,
  readJsonBounded,
  sanitizeHeaderValue,
  fieldErrors,
  isHoneypotFilled,
  isSubmittedTooFast,
} from '@/lib/forms/guards'
```

Add these two `describe` blocks right after the existing `describe('isHoneypotFilled', ...)` block (before the trailing `beforeEach`/`afterEach` env-isolation block at the bottom of the file):

```ts
describe('isSubmittedTooFast', () => {
  it('is true when elapsedMs is missing', () => {
    expect(isSubmittedTooFast({ name: 'x' })).toBe(true)
  })

  it('is true when elapsedMs is below the threshold', () => {
    expect(isSubmittedTooFast({ elapsedMs: 400 })).toBe(true)
  })

  it('is false when elapsedMs meets the threshold', () => {
    expect(isSubmittedTooFast({ elapsedMs: 1200 })).toBe(false)
  })

  it('is false when elapsedMs comfortably exceeds the threshold', () => {
    expect(isSubmittedTooFast({ elapsedMs: 5000 })).toBe(false)
  })

  it('is true for non-object input', () => {
    expect(isSubmittedTooFast(null)).toBe(true)
  })
})

describe('assertAllowedCountry', () => {
  function reqWithCountry(country: string | null) {
    const headers: Record<string, string> = { host: 'shop.example.com' }
    if (country) headers['x-vercel-ip-country'] = country
    return postRequest(headers)
  }

  it('allows a US request', () => {
    expect(assertAllowedCountry(reqWithCountry('US')).ok).toBe(true)
  })

  it('allows a CA request', () => {
    expect(assertAllowedCountry(reqWithCountry('CA')).ok).toBe(true)
  })

  it('rejects a request from outside the US/CA', () => {
    const result = assertAllowedCountry(reqWithCountry('RU'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(403)
  })

  it('allows when the country header is absent (non-Vercel environment)', () => {
    expect(assertAllowedCountry(reqWithCountry(null)).ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/forms/__tests__/guards.test.ts`
Expected: FAIL — `assertAllowedCountry` and `isSubmittedTooFast` are not exported members of `@/lib/forms/guards`.

- [ ] **Step 3: Write the implementation**

In `lib/forms/guards.ts`, update the module docstring (lines 3-10):

```ts
/**
 * Stateless request-hardening helpers shared by the form route handlers.
 *
 * The durable, per-IP rate limit lives at the Vercel WAF layer (see the DEV-21
 * design doc). These guards are cheap, in-process defense-in-depth: origin
 * pinning, a country allowlist, a body-size cap, a submission-timing check,
 * header-injection sanitization, and validation-error flattening for the
 * client.
 */
```

Insert this immediately after `assertNoForeignOrigin`'s closing brace (after line 61, before `type BoundedResult = ...`):

```ts
const ALLOWED_COUNTRIES = new Set(['US', 'CA'])

/**
 * Restricts form submissions to the US and Canada using Vercel's
 * `x-vercel-ip-country` edge header — the correct mechanism post-Next-15,
 * which removed `NextRequest.geo`/`.ip`. Absent outside Vercel (local dev,
 * other hosts) — skipped rather than blocking, since there's no signal to
 * act on.
 */
export function assertAllowedCountry(req: Request): Allowed {
  const country = req.headers.get('x-vercel-ip-country')
  if (country && !ALLOWED_COUNTRIES.has(country)) return { ok: false, status: 403 }
  return { ok: true }
}
```

Insert this immediately after `isHoneypotFilled`'s closing brace (after line 103, before `sanitizeHeaderValue`):

```ts
const MIN_FILL_MS = 1200

/**
 * True when the client-reported time since the form rendered is missing or
 * too short for a human to have filled a multi-field form — a bot signal
 * layered on top of the honeypot. Entirely stateless: no per-IP store.
 */
export function isSubmittedTooFast(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return true
  const elapsedMs = (data as Record<string, unknown>).elapsedMs
  return typeof elapsedMs !== 'number' || elapsedMs < MIN_FILL_MS
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/forms/__tests__/guards.test.ts`
Expected: PASS — all guards tests passing (existing + 9 new).

- [ ] **Step 5: Commit**

```bash
git add lib/forms/guards.ts lib/forms/__tests__/guards.test.ts
git commit -m "Add stateless time-trap and US/CA geo-lock guards"
```

---

### Task 4: Wire validation into the shared schema (`lib/forms/schema.ts`)

**Files:**
- Modify: `lib/forms/schema.ts` (full file — `baseFields` changes)
- Modify: `lib/forms/__tests__/schema.test.ts` (full file rewrite — async parse + DNS mock)

**Interfaces:**
- Consumes: `isValidNanpPhone` from Task 1 (`lib/forms/phone.ts`), `hasValidMxRecord` from Task 2 (`lib/forms/verify-email.ts`).
- Produces: `sourcingSchema` and `contactSchema` now require `.safeParseAsync()`/`.parseAsync()` instead of the sync variants (both have an async `email` refinement) — used by Task 5 and Task 6 (route handlers). Both schemas gain a new optional `elapsedMs: number` field.

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `lib/forms/__tests__/schema.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const resolveMx = vi.fn()
const resolve4 = vi.fn()
const resolve6 = vi.fn()

vi.mock('node:dns/promises', () => ({
  resolveMx: (...args: unknown[]) => resolveMx(...args),
  resolve4: (...args: unknown[]) => resolve4(...args),
  resolve6: (...args: unknown[]) => resolve6(...args),
}))

import { sourcingSchema, contactSchema, FACILITY_TYPES, SUBJECTS } from '@/lib/forms/schema'

beforeEach(() => {
  resolveMx.mockReset().mockResolvedValue([{ exchange: 'mx.clinic.com', priority: 10 }])
  resolve4.mockReset()
  resolve6.mockReset()
})

describe('sourcingSchema', () => {
  const valid = {
    name: 'Dr. Jane Smith',
    email: 'jane@clinic.com',
    phone: '+1 (212) 555-0100',
    facultyType: FACILITY_TYPES[0],
  }

  it('accepts a valid payload', async () => {
    expect((await sourcingSchema.safeParseAsync(valid)).success).toBe(true)
  })

  it('accepts a payload without the optional phone', async () => {
    const { phone, ...rest } = valid
    void phone
    expect((await sourcingSchema.safeParseAsync(rest)).success).toBe(true)
  })

  it('accepts a payload with elapsedMs', async () => {
    expect((await sourcingSchema.safeParseAsync({ ...valid, elapsedMs: 2000 })).success).toBe(true)
  })

  it('rejects an invalid email format', async () => {
    const result = await sourcingSchema.safeParseAsync({ ...valid, email: 'not-an-email' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'email')).toBe(true)
    }
  })

  it('rejects an email whose domain has no mail records', async () => {
    const err = Object.assign(new Error('nope'), { code: 'ENOTFOUND' })
    resolveMx.mockRejectedValue(err)
    resolve4.mockRejectedValue(err)
    resolve6.mockRejectedValue(err)
    const result = await sourcingSchema.safeParseAsync({ ...valid, email: 'jane@no-mail-here.test' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'email')).toBe(true)
    }
  })

  it('rejects a fake NANP phone number', async () => {
    const result = await sourcingSchema.safeParseAsync({ ...valid, phone: '+1 (555) 000-0000' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'phone')).toBe(true)
    }
  })

  it('rejects a missing name', async () => {
    expect((await sourcingSchema.safeParseAsync({ ...valid, name: '' })).success).toBe(false)
  })

  it('rejects a facultyType outside the enum', async () => {
    expect(
      (await sourcingSchema.safeParseAsync({ ...valid, facultyType: 'Spaceship Bay' })).success,
    ).toBe(false)
  })

  it('rejects unknown fields (.strict)', async () => {
    expect((await sourcingSchema.safeParseAsync({ ...valid, role: 'admin' })).success).toBe(false)
  })

  it('rejects a non-empty honeypot website field', async () => {
    expect(
      (await sourcingSchema.safeParseAsync({ ...valid, website: 'http://spam' })).success,
    ).toBe(false)
  })

  it('accepts an empty honeypot website field', async () => {
    expect((await sourcingSchema.safeParseAsync({ ...valid, website: '' })).success).toBe(true)
  })

  it('rejects an over-long name', async () => {
    expect(
      (await sourcingSchema.safeParseAsync({ ...valid, name: 'a'.repeat(121) })).success,
    ).toBe(false)
  })
})

describe('contactSchema', () => {
  const valid = {
    name: 'Dr. Jane Smith',
    email: 'jane@clinic.com',
    subject: SUBJECTS[0],
    message: 'Hello, I have a question about pricing.',
  }

  it('accepts a valid payload', async () => {
    expect((await contactSchema.safeParseAsync(valid)).success).toBe(true)
  })

  it('accepts a payload without the optional subject', async () => {
    const { subject, ...rest } = valid
    void subject
    expect((await contactSchema.safeParseAsync(rest)).success).toBe(true)
  })

  it('treats an empty subject string as no subject', async () => {
    const result = await contactSchema.safeParseAsync({ ...valid, subject: '' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.subject).toBeUndefined()
  })

  it('rejects a missing message', async () => {
    expect((await contactSchema.safeParseAsync({ ...valid, message: '' })).success).toBe(false)
  })

  it('rejects a subject outside the enum', async () => {
    expect((await contactSchema.safeParseAsync({ ...valid, subject: 'Nope' })).success).toBe(false)
  })

  it('rejects unknown fields (.strict)', async () => {
    expect((await contactSchema.safeParseAsync({ ...valid, extra: 1 })).success).toBe(false)
  })

  it('rejects a non-empty honeypot website field', async () => {
    expect((await contactSchema.safeParseAsync({ ...valid, website: 'x' })).success).toBe(false)
  })

  it('rejects an over-long message', async () => {
    expect(
      (await contactSchema.safeParseAsync({ ...valid, message: 'a'.repeat(5001) })).success,
    ).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/forms/__tests__/schema.test.ts`
Expected: FAIL — `sourcingSchema.safeParseAsync(...)` rejects/throws because `email`/`phone` have no async refinement yet (schema currently accepts fake phone `+1 (212) 555-0100`... wait, that one's real and passes already; the new-behavior tests — "rejects an email whose domain has no mail records" and "rejects a fake NANP phone number" — fail because the current schema has no such refinements).

- [ ] **Step 3: Write the implementation**

Replace the entire contents of `lib/forms/schema.ts`:

```ts
import { z } from 'zod'
import { hasValidMxRecord } from './verify-email'
import { isValidNanpPhone } from './phone'

/**
 * Single source of truth for the contact + sourcing forms.
 *
 * The same constants and schemas are imported by the client components, the API
 * route handlers, and the tests so the `<select>` options, the server-side enum
 * validation, and the test fixtures can never drift apart.
 */

export const FACILITY_TYPES = [
  'Urgent Care Center',
  'Hospital / Health System',
  'HRT / Wellness Clinic',
  'Home Care Agency',
  'EMS / First Responder',
  'Pharmacy',
  'Physical Therapy',
  'Other',
] as const

export const SUBJECTS = [
  'General inquiry',
  'Product availability',
  'Pricing question',
  'Order support',
  'Returns & refunds',
  'Other',
] as const

/**
 * Honeypot: a hidden `website` field real users never see. Bots that fill every
 * input trip it. It must be absent or empty — anything else fails validation.
 */
const honeypot = z.string().max(0).optional()

const baseFields = {
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  email: z
    .email('Enter a valid email')
    .max(254, 'Email is too long')
    .refine(hasValidMxRecord, 'This email address does not appear to be deliverable'),
  phone: z
    .string()
    .trim()
    .max(40, 'Phone is too long')
    .regex(/^[0-9+()\-.\s]*$/, 'Phone contains invalid characters')
    .optional()
    .refine(
      (v) => v === undefined || isValidNanpPhone(v),
      'Enter a valid US or Canadian phone number',
    ),
  website: honeypot,
  // Client-reported ms since the form rendered — the time-trap anti-bot
  // signal consumed by `isSubmittedTooFast` in lib/forms/guards.ts.
  elapsedMs: z.number().optional(),
}

export const sourcingSchema = z
  .object({
    ...baseFields,
    facultyType: z.enum(FACILITY_TYPES, { message: 'Choose a faculty type' }),
  })
  .strict()

export const contactSchema = z
  .object({
    ...baseFields,
    // The client sends '' when no subject is chosen; treat that as "no subject".
    subject: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.enum(SUBJECTS).optional(),
    ),
    message: z
      .string()
      .trim()
      .min(1, 'Message is required')
      .max(5000, 'Message is too long'),
  })
  .strict()

export type SourcingInput = z.infer<typeof sourcingSchema>
export type ContactInput = z.infer<typeof contactSchema>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/forms/__tests__/schema.test.ts`
Expected: PASS — all sourcingSchema/contactSchema tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/forms/schema.ts lib/forms/__tests__/schema.test.ts
git commit -m "Wire real email/phone validation into the shared form schema"
```

---

### Task 5: Contact route — geo-lock, time-trap, async validation

**Files:**
- Modify: `app/api/contact/route.ts` (full file)
- Modify: `app/api/contact/__tests__/route.test.ts` (full file)

**Interfaces:**
- Consumes: `assertAllowedCountry`, `isSubmittedTooFast` from Task 3; `contactSchema.safeParseAsync` from Task 4.
- Produces: nothing new consumed elsewhere — this is the outermost layer for the contact form.

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `app/api/contact/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const send = vi.fn()
const resolveMx = vi.fn()
const resolve4 = vi.fn()
const resolve6 = vi.fn()

vi.mock('@/lib/resend', () => ({
  getResend: () => ({ emails: { send } }),
  FROM_EMAIL: 'noreply@test.com',
  TO_EMAIL: 'team@test.com',
  SOURCING_TO_EMAIL: 'sourcing@test.com',
}))

vi.mock('node:dns/promises', () => ({
  resolveMx: (...args: unknown[]) => resolveMx(...args),
  resolve4: (...args: unknown[]) => resolve4(...args),
  resolve6: (...args: unknown[]) => resolve6(...args),
}))

import { POST } from '@/app/api/contact/route'
import { SUBJECTS } from '@/lib/forms/schema'

const HOST = 'shop.example.com'

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://${HOST}/api/contact`, {
    method: 'POST',
    headers: {
      host: HOST,
      origin: `https://${HOST}`,
      'content-type': 'application/json',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const valid = {
  name: 'Dr. Jane Smith',
  email: 'jane@clinic.com',
  subject: SUBJECTS[0],
  message: 'I have a question about pricing.',
  elapsedMs: 5000,
}

beforeEach(() => {
  send.mockReset()
  send.mockResolvedValue({ data: { id: 'email_123' }, error: null })
  resolveMx.mockReset().mockResolvedValue([{ exchange: 'mx.clinic.com', priority: 10 }])
  resolve4.mockReset()
  resolve6.mockReset()
})

describe('POST /api/contact', () => {
  it('sends and returns 200 on a valid payload', async () => {
    const res = await POST(post(valid))
    expect(res.status).toBe(200)
    expect(send).toHaveBeenCalledOnce()
  })

  it('delivers to the contact inbox', async () => {
    await POST(post(valid))
    expect(send.mock.calls[0][0].to).toBe('team@test.com')
  })

  it('returns 502 when Resend responds with an error object (no swallowing)', async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: 'application_error', message: 'boom', statusCode: 500 },
    })
    const res = await POST(post(valid))
    expect(res.status).toBe(502)
  })

  it('returns 403 on a cross-origin request', async () => {
    const res = await POST(post(valid, { origin: 'https://evil.net' }))
    expect(res.status).toBe(403)
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 403 with a clear message outside the US/Canada', async () => {
    const res = await POST(post(valid, { 'x-vercel-ip-country': 'RU' }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toMatch(/United States and Canada/)
    expect(send).not.toHaveBeenCalled()
  })

  it('allows a Canadian request', async () => {
    const res = await POST(post(valid, { 'x-vercel-ip-country': 'CA' }))
    expect(res.status).toBe(200)
    expect(send).toHaveBeenCalledOnce()
  })

  it('returns 400 on malformed JSON', async () => {
    const res = await POST(post('{not json'))
    expect(res.status).toBe(400)
  })

  it('returns 413 on an oversize body', async () => {
    const res = await POST(post({ ...valid, message: 'a'.repeat(20_000) }))
    expect(res.status).toBe(413)
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 400 with field errors on a missing message', async () => {
    const res = await POST(post({ ...valid, message: '' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.fields.message).toBeTruthy()
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 200 but does not send when the honeypot is filled', async () => {
    const res = await POST(post({ ...valid, website: 'x' }))
    expect(res.status).toBe(200)
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 200 but does not send when submitted too fast', async () => {
    const res = await POST(post({ ...valid, elapsedMs: 200 }))
    expect(res.status).toBe(200)
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 200 but does not send when elapsedMs is missing', async () => {
    const { elapsedMs, ...withoutTiming } = valid
    void elapsedMs
    const res = await POST(post(withoutTiming))
    expect(res.status).toBe(200)
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 400 when the email domain has no mail records', async () => {
    const err = Object.assign(new Error('nope'), { code: 'ENOTFOUND' })
    resolveMx.mockRejectedValue(err)
    resolve4.mockRejectedValue(err)
    resolve6.mockRejectedValue(err)
    const res = await POST(post({ ...valid, email: 'jane@no-mail-here.test' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.fields.email).toBeTruthy()
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 502 when Resend fails', async () => {
    send.mockRejectedValue(new Error('resend 500'))
    const res = await POST(post(valid))
    expect(res.status).toBe(502)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/api/contact/__tests__/route.test.ts`
Expected: FAIL — the geo/time-trap tests fail (no such behavior yet), and `schema.safeParse` (sync) throws on the async email refinement from Task 4, breaking even the previously-passing tests.

- [ ] **Step 3: Write the implementation**

Replace the entire contents of `app/api/contact/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { TO_EMAIL } from '@/lib/resend'
import { contactSchema } from '@/lib/forms/schema'
import { sendFormEmail } from '@/lib/forms/email'
import {
  assertAllowedOrigin,
  assertAllowedCountry,
  readJsonBounded,
  sanitizeHeaderValue,
  fieldErrors,
  isHoneypotFilled,
  isSubmittedTooFast,
} from '@/lib/forms/guards'

export async function POST(req: Request) {
  const origin = assertAllowedOrigin(req)
  if (!origin.ok) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
  }

  const country = assertAllowedCountry(req)
  if (!country.ok) {
    return NextResponse.json(
      { error: 'This form is only available to customers in the United States and Canada.' },
      { status: 403 },
    )
  }

  const read = await readJsonBounded(req)
  if (!read.ok) {
    const error = read.status === 413 ? 'Payload too large' : 'Invalid JSON'
    return NextResponse.json({ error }, { status: read.status })
  }

  // Silently accept (but never send) bot submissions that trip the honeypot or
  // submit too fast to be human, so scripted clients can't tell a drop from a
  // real send.
  if (isHoneypotFilled(read.data) || isSubmittedTooFast(read.data)) {
    return NextResponse.json({ ok: true })
  }

  const parsed = await contactSchema.safeParseAsync(read.data)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: fieldErrors(parsed.error) },
      { status: 400 },
    )
  }

  const { name, email, subject, message } = parsed.data

  const sent = await sendFormEmail({
    to: TO_EMAIL,
    replyTo: sanitizeHeaderValue(email),
    subject: subject
      ? sanitizeHeaderValue(`[Contact] ${subject}`)
      : '[Contact] New message from MDSupplies',
    text: [
      `Name:    ${name}`,
      `Email:   ${email}`,
      `Subject: ${subject || '—'}`,
      '',
      message,
    ].join('\n'),
    formName: 'contact',
  })

  if (!sent.ok) {
    return NextResponse.json({ error: 'Email delivery failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/api/contact/__tests__/route.test.ts`
Expected: PASS — all tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/api/contact/route.ts app/api/contact/__tests__/route.test.ts
git commit -m "Add geo-lock and time-trap to the contact route"
```

---

### Task 6: Sourcing route — geo-lock, time-trap, async validation

**Files:**
- Modify: `app/api/sourcing/route.ts` (full file)
- Modify: `app/api/sourcing/__tests__/route.test.ts` (full file)

**Interfaces:**
- Consumes: `assertAllowedCountry`, `isSubmittedTooFast` from Task 3; `sourcingSchema.safeParseAsync` from Task 4.
- Produces: nothing new consumed elsewhere — this is the outermost layer for the wholesale sourcing form.

- [ ] **Step 1: Write the failing tests**

Replace the entire contents of `app/api/sourcing/__tests__/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const send = vi.fn()
const resolveMx = vi.fn()
const resolve4 = vi.fn()
const resolve6 = vi.fn()

vi.mock('@/lib/resend', () => ({
  getResend: () => ({ emails: { send } }),
  FROM_EMAIL: 'noreply@test.com',
  TO_EMAIL: 'team@test.com',
  SOURCING_TO_EMAIL: 'sourcing@test.com',
}))

vi.mock('node:dns/promises', () => ({
  resolveMx: (...args: unknown[]) => resolveMx(...args),
  resolve4: (...args: unknown[]) => resolve4(...args),
  resolve6: (...args: unknown[]) => resolve6(...args),
}))

import { POST } from '@/app/api/sourcing/route'
import { FACILITY_TYPES } from '@/lib/forms/schema'

const HOST = 'shop.example.com'

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://${HOST}/api/sourcing`, {
    method: 'POST',
    headers: {
      host: HOST,
      origin: `https://${HOST}`,
      'content-type': 'application/json',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const valid = {
  name: 'Dr. Jane Smith',
  email: 'jane@clinic.com',
  phone: '+1 (212) 555-0100',
  facultyType: FACILITY_TYPES[0],
  elapsedMs: 5000,
}

beforeEach(() => {
  send.mockReset()
  send.mockResolvedValue({ data: { id: 'email_123' }, error: null })
  resolveMx.mockReset().mockResolvedValue([{ exchange: 'mx.clinic.com', priority: 10 }])
  resolve4.mockReset()
  resolve6.mockReset()
})

describe('POST /api/sourcing', () => {
  it('sends and returns 200 on a valid payload', async () => {
    const res = await POST(post(valid))
    expect(res.status).toBe(200)
    expect(send).toHaveBeenCalledOnce()
  })

  it('delivers to the dedicated sourcing inbox', async () => {
    await POST(post(valid))
    expect(send.mock.calls[0][0].to).toBe('sourcing@test.com')
  })

  it('returns 502 when Resend responds with an error object (no swallowing)', async () => {
    send.mockResolvedValue({
      data: null,
      error: { name: 'application_error', message: 'boom', statusCode: 500 },
    })
    const res = await POST(post(valid))
    expect(res.status).toBe(502)
  })

  it('returns 403 on a cross-origin request', async () => {
    const res = await POST(post(valid, { origin: 'https://evil.net' }))
    expect(res.status).toBe(403)
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 403 with a clear message outside the US/Canada', async () => {
    const res = await POST(post(valid, { 'x-vercel-ip-country': 'RU' }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toMatch(/United States and Canada/)
    expect(send).not.toHaveBeenCalled()
  })

  it('allows a Canadian request', async () => {
    const res = await POST(post(valid, { 'x-vercel-ip-country': 'CA' }))
    expect(res.status).toBe(200)
    expect(send).toHaveBeenCalledOnce()
  })

  it('returns 400 on malformed JSON', async () => {
    const res = await POST(post('{not json'))
    expect(res.status).toBe(400)
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 413 on an oversize body', async () => {
    const res = await POST(post({ ...valid, name: 'a'.repeat(20_000) }))
    expect(res.status).toBe(413)
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 400 with field errors on an invalid email', async () => {
    const res = await POST(post({ ...valid, email: 'nope' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.fields.email).toBeTruthy()
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 400 with field errors on a fake phone number', async () => {
    const res = await POST(post({ ...valid, phone: '+1 (555) 000-0000' }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.fields.phone).toBeTruthy()
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 400 on unknown fields', async () => {
    const res = await POST(post({ ...valid, role: 'admin' }))
    expect(res.status).toBe(400)
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 200 but does not send when the honeypot is filled', async () => {
    const res = await POST(post({ ...valid, website: 'http://spam' }))
    expect(res.status).toBe(200)
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 200 but does not send when submitted too fast', async () => {
    const res = await POST(post({ ...valid, elapsedMs: 200 }))
    expect(res.status).toBe(200)
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 200 but does not send when elapsedMs is missing', async () => {
    const { elapsedMs, ...withoutTiming } = valid
    void elapsedMs
    const res = await POST(post(withoutTiming))
    expect(res.status).toBe(200)
    expect(send).not.toHaveBeenCalled()
  })

  it('returns 502 when Resend fails', async () => {
    send.mockRejectedValue(new Error('resend 500'))
    const res = await POST(post(valid))
    expect(res.status).toBe(502)
  })

  it('does not leak CRLF header injection into the email subject', async () => {
    await POST(post({ ...valid, name: 'Jane\r\nBcc: evil@x.com' }))
    expect(send).toHaveBeenCalledOnce()
    const arg = send.mock.calls[0][0]
    expect(arg.subject).not.toMatch(/[\r\n]/)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/api/sourcing/__tests__/route.test.ts`
Expected: FAIL — geo/time-trap/fake-phone tests fail, and the sync `safeParse` call breaks on the async email refinement.

- [ ] **Step 3: Write the implementation**

Replace the entire contents of `app/api/sourcing/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { SOURCING_TO_EMAIL } from '@/lib/resend'
import { sourcingSchema } from '@/lib/forms/schema'
import { sendFormEmail } from '@/lib/forms/email'
import {
  assertAllowedOrigin,
  assertAllowedCountry,
  readJsonBounded,
  sanitizeHeaderValue,
  fieldErrors,
  isHoneypotFilled,
  isSubmittedTooFast,
} from '@/lib/forms/guards'

export async function POST(req: Request) {
  const origin = assertAllowedOrigin(req)
  if (!origin.ok) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
  }

  const country = assertAllowedCountry(req)
  if (!country.ok) {
    return NextResponse.json(
      { error: 'This form is only available to customers in the United States and Canada.' },
      { status: 403 },
    )
  }

  const read = await readJsonBounded(req)
  if (!read.ok) {
    const error = read.status === 413 ? 'Payload too large' : 'Invalid JSON'
    return NextResponse.json({ error }, { status: read.status })
  }

  // Silently accept (but never send) bot submissions that trip the honeypot or
  // submit too fast to be human, so scripted clients can't tell a drop from a
  // real send.
  if (isHoneypotFilled(read.data) || isSubmittedTooFast(read.data)) {
    return NextResponse.json({ ok: true })
  }

  const parsed = await sourcingSchema.safeParseAsync(read.data)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: fieldErrors(parsed.error) },
      { status: 400 },
    )
  }

  const { name, email, phone, facultyType } = parsed.data

  const sent = await sendFormEmail({
    to: SOURCING_TO_EMAIL,
    replyTo: sanitizeHeaderValue(email),
    subject: sanitizeHeaderValue(`[Sourcing Request] ${facultyType} — ${name}`),
    text: [
      `Name:          ${name}`,
      `Email:         ${email}`,
      `Phone:         ${phone || '—'}`,
      `Facility Type: ${facultyType}`,
    ].join('\n'),
    formName: 'sourcing',
  })

  if (!sent.ok) {
    return NextResponse.json({ error: 'Email delivery failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/api/sourcing/__tests__/route.test.ts`
Expected: PASS — all tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/api/sourcing/route.ts app/api/sourcing/__tests__/route.test.ts
git commit -m "Add geo-lock and time-trap to the sourcing route"
```

---

### Task 7: Contact form client — time-trap field + real error display

**Files:**
- Modify: `app/contact/ContactForm.tsx` (full file)
- Test: `app/contact/__tests__/ContactForm.test.tsx`

**Interfaces:**
- Consumes: `submitForm` (unchanged signature) from `lib/forms/submit.ts`.
- Produces: nothing consumed elsewhere — leaf UI component.

- [ ] **Step 1: Write the failing test**

Create `app/contact/__tests__/ContactForm.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { ContactForm } from '../ContactForm'

const track = vi.fn()
vi.mock('@/lib/analytics/track', () => ({ track: (e: unknown) => track(e) }))

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(cleanup)
beforeEach(() => {
  track.mockReset()
  vi.restoreAllMocks()
})

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Dr. Jane Smith' } })
  fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'jane@clinic.com' } })
  fireEvent.change(screen.getByLabelText(/Message/i), { target: { value: 'Question about pricing.' } })
}

describe('ContactForm', () => {
  it("shows the server's error message when the API rejects the submission", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(403, {
          error: 'This form is only available to customers in the United States and Canada.',
        }),
      ),
    )

    render(<ContactForm />)
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: /Send Message/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'This form is only available to customers in the United States and Canada.',
      ),
    )
    expect(track).not.toHaveBeenCalled()
  })

  it('falls back to a generic message when the server gives no error text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(502, {})))

    render(<ContactForm />)
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: /Send Message/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong. Please try again or email us directly.',
      ),
    )
  })

  it('sends elapsedMs based on time since mount', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    render(<ContactForm />)
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: /Send Message/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(typeof body.elapsedMs).toBe('number')
    expect(body.elapsedMs).toBeGreaterThanOrEqual(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/contact/__tests__/ContactForm.test.tsx`
Expected: FAIL — `elapsedMs` is `undefined` in the posted body (not yet sent), and the "generic message" test currently would pass by coincidence but the geo-message test fails because the component still shows the hardcoded generic string instead of `result.error`.

- [ ] **Step 3: Write the implementation**

In `app/contact/ContactForm.tsx`, change the import line:

```ts
import { useRef, useState } from 'react'
```

Add a mount-timestamp ref right after the existing `useState` declarations:

```ts
export function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' })
  const [status, setStatus] = useState<Status>('idle')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const mountedAt = useRef(Date.now())
```

Change the `submitForm` call inside `handleSubmit` to include `elapsedMs`:

```ts
    // Only the non-PII subject is sent to analytics — never name/email/message.
    const result = await submitForm({
      url: '/api/contact',
      payload: { ...form, elapsedMs: Date.now() - mountedAt.current },
      analyticsEvent: buildFormSubmitEvent({
        formName: 'contact',
        details: { subject: form.subject || 'none' },
      }),
    })
```

Change the error branch to surface the server's real message:

```ts
    // Preserve the user's input for retry; surface what went wrong.
    setStatus('error')
    setFieldErrors(result.fields ?? {})
    if (!result.fields) {
      setServerError(result.error ?? 'Something went wrong. Please try again or email us directly.')
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/contact/__tests__/ContactForm.test.tsx`
Expected: PASS — all 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add app/contact/ContactForm.tsx app/contact/__tests__/ContactForm.test.tsx
git commit -m "Add time-trap timing field and real error display to the contact form"
```

---

### Task 8: Wholesale sourcing form client — time-trap field + real error display

**Files:**
- Modify: `components/home/WholesalePricing.tsx` (full file)
- Test: `components/home/__tests__/WholesalePricing.test.tsx`

**Interfaces:**
- Consumes: `submitForm` (unchanged signature) from `lib/forms/submit.ts`; `FACILITY_TYPES` from `lib/forms/schema.ts`.
- Produces: nothing consumed elsewhere — leaf UI component.

- [ ] **Step 1: Write the failing test**

Create `components/home/__tests__/WholesalePricing.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { WholesalePricing } from '../WholesalePricing'
import { FACILITY_TYPES } from '@/lib/forms/schema'

const track = vi.fn()
vi.mock('@/lib/analytics/track', () => ({ track: (e: unknown) => track(e) }))

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(cleanup)
beforeEach(() => {
  track.mockReset()
  vi.restoreAllMocks()
})

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/Faculty Name/i), { target: { value: 'Dr. Jane Smith' } })
  fireEvent.change(screen.getByLabelText(/Your Email/i), { target: { value: 'jane@clinic.com' } })
  fireEvent.change(screen.getByLabelText(/Select Faculty Type/i), {
    target: { value: FACILITY_TYPES[0] },
  })
}

describe('WholesalePricing', () => {
  it("shows the server's error message when the API rejects the submission", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(403, {
          error: 'This form is only available to customers in the United States and Canada.',
        }),
      ),
    )

    render(<WholesalePricing />)
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: /SUBMIT APPLICATION/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'This form is only available to customers in the United States and Canada.',
      ),
    )
    expect(track).not.toHaveBeenCalled()
  })

  it('falls back to a generic message when the server gives no error text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(502, {})))

    render(<WholesalePricing />)
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: /SUBMIT APPLICATION/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong. Please try again or email us directly.',
      ),
    )
  })

  it('sends elapsedMs based on time since mount', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    render(<WholesalePricing />)
    fillRequiredFields()
    fireEvent.click(screen.getByRole('button', { name: /SUBMIT APPLICATION/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(typeof body.elapsedMs).toBe('number')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/home/__tests__/WholesalePricing.test.tsx`
Expected: FAIL — `elapsedMs` missing from the posted body, and the geo-message test fails because the hardcoded generic string is shown instead.

- [ ] **Step 3: Write the implementation**

In `components/home/WholesalePricing.tsx`, change the import line:

```ts
import { useRef, useState } from "react";
```

Add a mount-timestamp ref right after the existing `useState` declarations:

```ts
export function WholesalePricing() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    facultyType: "",
    website: "", // honeypot — must stay empty
  });
  const [status, setStatus] = useState<Status>('idle')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const mountedAt = useRef(Date.now())
```

Change the `submitForm` call inside `handleSubmit` to include `elapsedMs`:

```ts
    // Only enum/non-PII detail is sent to analytics — never name/email/phone.
    const result = await submitForm({
      url: '/api/sourcing',
      payload: { ...form, elapsedMs: Date.now() - mountedAt.current },
      analyticsEvent: buildFormSubmitEvent({
        formName: 'sourcing_request',
        details: { faculty_type: form.facultyType },
      }),
    })
```

Change the error branch to surface the server's real message:

```ts
    // Preserve the user's input for retry; surface what went wrong.
    setStatus('error')
    setFieldErrors(result.fields ?? {})
    if (!result.fields) {
      setServerError(result.error ?? 'Something went wrong. Please try again or email us directly.')
    }
```

Update the phone input's placeholder — `+1 (555) 000-0000` is not a real NANP number and would now be rejected if a user copied it verbatim:

```tsx
                placeholder="+1 (212) 555-0100"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run components/home/__tests__/WholesalePricing.test.tsx`
Expected: PASS — all 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add components/home/WholesalePricing.tsx components/home/__tests__/WholesalePricing.test.tsx
git commit -m "Add time-trap timing field and real error display to the wholesale sourcing form"
```

---

### Task 9: Full suite verification

**Files:** none (verification only).

**Interfaces:** none — this task only runs the full test suite and typechecker across everything built in Tasks 1-8.

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — every test file in the repo passes, including the untouched pre-existing suites (`submit.test.ts`, `email.test.ts`, and all non-forms tests), confirming nothing outside this feature's files regressed.

- [ ] **Step 2: Run the TypeScript compiler**

Run: `npx tsc --noEmit`
Expected: No type errors. In particular, confirms the `Allowed`-typed return from `assertAllowedCountry`, the new `elapsedMs?: number` field on both inferred schema types, and the `useRef` additions in both client components all typecheck cleanly.

- [ ] **Step 3: Manual smoke check (dev server)**

Run: `npm run dev`, then in a browser:
1. Open `/contact`, fill in the form with a real-looking email/phone, submit within under a second of the page loading (e.g. by using browser autofill and immediately clicking submit) — confirm it appears to succeed (no error shown) even though the send was silently dropped server-side (check server logs / that no email arrives).
2. Reload, fill the form normally (taking a few seconds), submit — confirm the success message appears and (if `RESEND_API_KEY` is configured in the dev environment) an email arrives.
3. On the homepage, scroll to the wholesale sourcing section, submit with an obviously fake phone number like `555-0000` — confirm an inline "Enter a valid US or Canadian phone number" error appears next to the phone field.
Expected: All three behaviors match; no console errors.

- [ ] **Step 4: Commit (only if Step 3 required any fixes)**

If the manual smoke check surfaced no issues, there is nothing to commit for this task — Tasks 1-8 already captured every code change.
