import 'server-only'

// Plain server-side env var (not NEXT_PUBLIC_) — the resolver only ever runs
// server-side; resolved display data crosses to the client as already-
// computed props, never as raw resolver access. Defaults to disabled on any
// unset/invalid value, so a missing var in any environment (including a
// misconfigured prod deploy) fails to disabled, never enabled.
export function isShippingResolverEnabled(): boolean {
  return process.env.SHIPPING_RESOLVER_ENABLED === 'true'
}

// RATES_ONLY_SHOWS_CLAIM — HARDENED, no environment-variable escape hatch
// (Juliette's directive, DEV-SHIP-03): a `standard-free` classification must
// ALWAYS be independently confirmed by the underlying rate math
// (`effective_rate_class`) before a Free Shipping claim renders — see
// resolve.ts. This used to read process.env.RATES_ONLY_SHOWS_CLAIM and only
// disable the check on the exact string 'false'; that escape hatch is
// deliberately removed so no environment misconfiguration (or a well-meaning
// but wrong .env value) can ever loosen this guarantee again. Kept as a named
// function, not inlined at each call site, so the guarantee has exactly one
// place to read and one place a future change would have to deliberately
// touch — an accidental revert of this comment/return value is the only way
// to reopen the hole, not a stray env var.
export function isRatesOnlyClaimEnabled(): boolean {
  return true
}
