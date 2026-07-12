import { headers } from 'next/headers'

/** Reads the per-request CSP nonce proxy.ts set on `x-nonce`. Calling this
 *  forces the caller's route to render dynamically — accepted trade-off,
 *  see docs/superpowers/plans/2026-07-12-csp-nonce-enforcement.md. */
export async function getNonce(): Promise<string | undefined> {
  return (await headers()).get('x-nonce') ?? undefined
}
