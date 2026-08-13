import type { ShippingDisplay } from './resolve'
import { FALLBACK } from './resolve'

/**
 * Truthy `custom.free_shipping` values ("true"/"1"/"yes"), accepting the raw
 * `{value}` shape, a bare string, or an already-flattened boolean — the same
 * parsing convention as lib/labels/labels.ts's isBackorderedMetafield, kept
 * here rather than there because labels.ts explicitly documents that a
 * free-shipping claim never originates from it (DEV-LABEL-01): the shipping
 * resolver module owns this metafield end to end.
 */
export function isFreeShippingMetafieldTrue(
  raw?: { value: string } | string | boolean | null,
): boolean {
  if (typeof raw === 'boolean') return raw
  const v = typeof raw === 'string' ? raw : raw?.value
  return ['true', '1', 'yes'].includes((v ?? '').trim().toLowerCase())
}

/**
 * DEV-SHIP-02: `custom.free_shipping` is a second, independent gate layered
 * on top of the resolver's own standard-free + effective_rate_class=FREE
 * confirmation (RATES_ONLY_SHOWS_CLAIM, resolve.ts) — never a replacement
 * for it and never a source of a NEW claim.
 *
 * This can only ever NARROW: a resolver-confirmed `standard-free` display
 * downgrades to FALLBACK when the merchant boolean is not true. Every other
 * class the resolver can produce — threshold, standard-paid, manual-quote,
 * unknown, and the FALLBACK already used for held / duplicate-variant /
 * mixed-variant / failed-registry products — passes through completely
 * unchanged, in both directions: a false/null/missing boolean can never
 * manufacture a claim on those, and a true boolean can never resurrect one
 * either. The boolean has no opinion on anything but a resolver-confirmed
 * standard-free result.
 *
 * `effective_rate_class` itself is never read here: like resolve.ts's own
 * "unsafe" fields, it never crosses into ShippingDisplay. Whether the
 * resolver's `standard-free` already means "rates confirm FREE" is entirely
 * RATES_ONLY_SHOWS_CLAIM's job (resolve.ts) — this function only adds the
 * merchant's own opt-in on top of whatever that already guarantees.
 */
export function gateFreeShippingClaim(
  display: ShippingDisplay,
  freeShippingRaw?: { value: string } | string | boolean | null,
): ShippingDisplay {
  if (display.class !== 'standard-free') return display
  return isFreeShippingMetafieldTrue(freeShippingRaw) ? display : FALLBACK
}

/** Same gate, applied to a resolveVariantsForProduct()-shaped map. */
export function gateFreeShippingClaims(
  displays: Record<string, ShippingDisplay>,
  freeShippingRaw?: { value: string } | string | boolean | null,
): Record<string, ShippingDisplay> {
  const out: Record<string, ShippingDisplay> = {}
  for (const [variantGid, display] of Object.entries(displays)) {
    out[variantGid] = gateFreeShippingClaim(display, freeShippingRaw)
  }
  return out
}
