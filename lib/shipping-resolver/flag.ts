import 'server-only'

// Plain server-side env var (not NEXT_PUBLIC_) — the resolver only ever runs
// server-side; resolved display data crosses to the client as already-
// computed props, never as raw resolver access. Defaults to disabled on any
// unset/invalid value, so a missing var in any environment (including a
// misconfigured prod deploy) fails to disabled, never enabled.
export function isShippingResolverEnabled(): boolean {
  return process.env.SHIPPING_RESOLVER_ENABLED === 'true'
}
