import 'server-only'

// Plain server-side env var (not NEXT_PUBLIC_) — the resolver only ever runs
// server-side; resolved display data crosses to the client as already-
// computed props, never as raw resolver access. Defaults to disabled on any
// unset/invalid value, so a missing var in any environment (including a
// misconfigured prod deploy) fails to disabled, never enabled.
export function isShippingResolverEnabled(): boolean {
  return process.env.SHIPPING_RESOLVER_ENABLED === 'true'
}

// RATES_ONLY_SHOWS_CLAIM — the flag alone must never CREATE a Free Shipping
// claim; it only ever narrows one. When on, a `standard-free` classification
// additionally requires the underlying rate math (`effective_rate_class`) to
// independently confirm FREE before the claim renders — see resolve.ts. This
// fails the OPPOSITE direction from isShippingResolverEnabled: that flag's
// safe default is disabled (no claim), but this flag's safe default is
// ENABLED (the stricter check stays on), because an unset/invalid value here
// should never silently loosen an already-narrow claim path. Same reasoning
// RX_CHECKOUT_ENFORCEMENT documents for failing to the safer side.
export function isRatesOnlyClaimEnabled(): boolean {
  return process.env.RATES_ONLY_SHOWS_CLAIM !== 'false'
}
