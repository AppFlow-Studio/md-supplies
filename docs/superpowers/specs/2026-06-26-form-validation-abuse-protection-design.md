# DEV-21 — Form validation, abuse protection & false-success fix

**Date:** 2026-06-26 · **Owner:** Munis · **Priority:** P0
**Dependency:** Vercel WAF (head dev) owns the durable rate limiter.
**Source ticket:** M2/M3 · DEV-21.

## Problem

1. **False-success bug.** `components/home/WholesalePricing.tsx` does
   `await fetch('/api/sourcing', …)` then `setStatus('success')` **without
   checking `res.ok`** — users see success even on a 500. The contact form
   (`app/contact/ContactForm.tsx`) already checks `res.ok`.
2. **No hardening.** Neither `app/api/sourcing/route.ts` nor
   `app/api/contact/route.ts` has a strict schema, honeypot, origin/host check,
   body-size limit, or rate limiter.

## Goals

Strict bounded validation, durable rate limiting + bot protection, structured
`400/403/413/429`/provider-error responses, and a UI that reports success only on
confirmed delivery — with **no PII in logs or `dataLayer`**.

## Non-goals

- The durable, per-IP production rate limiter is implemented at the **Vercel WAF**
  layer by the head dev (see "WAF rule" below). The app does **not** add an
  in-app durable store (no Upstash/KV/Redis). A process-local `Map` is explicitly
  out of scope.
- No redesign of form visuals. `WholesalePricing.tsx` is Sardorbek's homepage
  surface — the client change is minimal and must be synced with him.

## Architecture

```
client form ──POST JSON──▶ route handler
                            │
                            ├─ assertAllowedOrigin(req)      → 403
                            ├─ readJsonBounded(req, 16KB)    → 413 / 400
                            ├─ schema.safeParse(body)        → 400 {error, fields}
                            ├─ honeypot website non-empty    → 200 {ok:true} (drop)
                            ├─ sanitizeHeaderValue(...)
                            └─ getResend().emails.send(...)  → 502 on failure / 200
```

### New module: `lib/forms/schema.ts`

Single source of truth shared by client, server, and tests. Uses `zod` (new dep).

- `FACILITY_TYPES` and `SUBJECTS` constants live here (moved out of the
  components) so the client `<select>` options and the server enum cannot drift.
- `baseFields`:
  - `name` — trimmed string, 1–120 chars.
  - `email` — `z.string().email()`, ≤254 chars.
  - `phone` — optional, ≤40 chars, permissive (`+`, digits, spaces, `()-.`).
  - `website` — honeypot: optional, must be empty/absent (`z.string().max(0)`).
- `sourcingSchema = z.object({...baseFields, facultyType: z.enum(FACILITY_TYPES)}).strict()`
- `contactSchema  = z.object({...baseFields, subject: z.enum(SUBJECTS).optional(), message: z.string().trim().min(1).max(5000)}).strict()`
- `.strict()` rejects unknown fields with a 400.
- Export inferred types `SourcingInput`, `ContactInput`.

### New module: `lib/forms/guards.ts`

Stateless helpers, reused by both routes. Pure functions where possible for easy
unit testing.

- `assertAllowedOrigin(req): { ok: true } | { ok: false; status: 403 }`
  - Resolves allowed hosts from the request `Host` header plus
    `NEXT_PUBLIC_SITE_URL` (if set). Compares the **host** of `Origin` (falling
    back to `Referer`). Missing both, or host mismatch → not allowed.
  - GET-less POST-only routes: a missing Origin **and** Referer is treated as
    disallowed (browsers send Origin on cross-origin POST; same-origin fetch
    sends it too in modern browsers).
- `readJsonBounded(req, maxBytes = 16384): Promise<{ ok: true; data: unknown } | { ok: false; status: 413 | 400 }>`
  - If `Content-Length` exceeds `maxBytes` → 413. Reads the body, enforces the
    byte cap while reading (guard against missing/lying Content-Length), then
    `JSON.parse`; parse failure → 400.
- `sanitizeHeaderValue(s: string): string` — strips CR/LF (`\r`, `\n`) so user
  input cannot inject headers via the email subject / `replyTo`.
- `fieldErrors(error: ZodError): Record<string, string>` — flattens to the first
  message per field for the client to render inline.

### Route handlers — uniform pipeline

Both `app/api/sourcing/route.ts` and `app/api/contact/route.ts`:

1. `assertAllowedOrigin` → `403 { error: 'Forbidden origin' }`.
2. `readJsonBounded` → `413 { error: 'Payload too large' }` / `400 { error: 'Invalid JSON' }`.
3. `schema.safeParse` → `400 { error: 'Validation failed', fields }`.
4. Honeypot (`website` non-empty after parse — schema already rejects it, but the
   drop-silently path returns `200 { ok: true }` **without sending**; belt and
   suspenders).
5. `sanitizeHeaderValue` on values interpolated into subject/`replyTo`.
6. `getResend().emails.send(...)` inside try/catch → `502 { error: 'Email delivery failed' }`.
7. Success → `200 { ok: true }`.

**Logging:** on the Resend failure path, log only the error class/status — never
field values. No `console.log` of the parsed body anywhere.

**Status code note:** `429` is returned by the **WAF**, not the app. The client
treats any non-2xx (including 429) as a failure; no special app code emits 429.

### Client changes

**`components/home/WholesalePricing.tsx`** (the false-success fix):
- Branch on `res.ok`. On non-2xx, parse `{ error, fields }` and render inline
  field errors next to inputs plus a server-error line.
- **Preserve input** on error (do not reset `form`).
- Add a visually-hidden `website` honeypot input (off-screen, `tabIndex=-1`,
  `autoComplete="off"`, `aria-hidden`).
- Emit `form_submit` **only after** confirmed `res.ok`.
- Import `FACILITY_TYPES` from `lib/forms/schema.ts`. The posted JSON key stays
  `facultyType` (matches the existing client state and the route's destructure),
  and `sourcingSchema` validates that key against the `FACILITY_TYPES` enum.

**`app/contact/ContactForm.tsx`** (parity):
- Add the `website` honeypot input.
- Render `fields` errors inline when the server returns 400.
- Import `SUBJECTS` from `lib/forms/schema.ts`. Already checks `res.ok`.

**Analytics (`form_submit`):** details remain enum-only — `faculty_type`
(sourcing) and `subject` (contact). **No** name/email/phone/message/address ever
enters `track()` / `dataLayer`. This is already true and must stay true.

### Accessibility

- Inline errors use `aria-describedby` linking the input to its error node and
  `aria-invalid` on the field when errored. The server-error summary is in an
  `role="alert"` region so it's announced.

## Testing (`vitest`)

Add `"test": "vitest run"` to `package.json`.

Per "Evidence for Done":

| Case | Where | Expectation |
| --- | --- | --- |
| Malformed JSON | route | 400 |
| Invalid email | schema/route | 400 + `fields.email` |
| Unknown field | schema | 400 (`.strict()`) |
| Oversize body | guards/route | 413 |
| Honeypot filled | route | 200, **no send** |
| Wrong origin | guards/route | 403 |
| Rate limit | (WAF — documented, not app-tested) | n/a in app |
| Resend 5xx | route | 502 |
| Valid payload | route | 200 + send called once |
| Analytics absence on failure | client | `track` not called on non-2xx |

Route tests mock `getResend()` and `assertAllowedOrigin` inputs via crafted
`Request` objects. Client test renders the form, mocks `fetch` non-2xx, asserts
`track` is not called and input is preserved.

## WAF rule (head dev — out of app scope, documented for handoff)

Add a Vercel Firewall rule rate-limiting `POST /api/sourcing` and
`POST /api/contact` per client IP (suggested: 5 requests / 10 min, then
challenge or 429). The app surfaces any 429 as a normal error to the user.

## New dependencies / env

- **Dep:** `zod`.
- **Env:** none.

## Risks

- Origin checks can break legitimate clients that strip `Origin`/`Referer`
  (privacy extensions). Mitigation: accept same-host `Referer` as well; the WAF
  remains the primary abuse control, so the origin check is defense-in-depth, not
  the sole gate.
