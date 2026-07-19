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

function isInconclusive(outcome: LookupOutcome<unknown>): outcome is 'timeout' | 'error' {
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
