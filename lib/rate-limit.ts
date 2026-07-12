/**
 * Lightweight in-process, fixed-window rate limiter.
 *
 * Defense-in-depth beneath the Vercel WAF rule: state is per serverless
 * instance, so this is a soft cap that blunts single-instance abuse (tight
 * request loops against the Storefront API), not a durable per-IP guarantee.
 * Anything durable belongs at the WAF layer.
 */

type Window = { count: number; resetAt: number }

const buckets = new Map<string, Window>()

// Cap the table so a rotating-key flood can't grow memory unboundedly; on
// overflow, drop expired windows first, then start over.
const MAX_BUCKETS = 10_000

export function isRateLimited(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, w] of buckets) {
        if (w.resetAt <= now) buckets.delete(k)
      }
      if (buckets.size >= MAX_BUCKETS) buckets.clear()
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  bucket.count += 1
  return bucket.count > limit
}

/** Best-effort client IP: first hop of x-forwarded-for (set by Vercel). */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
