import type { ProductVariant } from '@/lib/shopify/types'
import { getDefaultVariant, type VariantForDefault } from '@/lib/purchasability'

/**
 * Resolves the variant a PDP should render as selected, from an optional
 * `?variant=<Shopify variant GID>` query param. Shared by both PDP routes
 * (server-side, for the initial render/schema/metadata) and the client
 * selection hook (as its seed) so "invalid/missing id falls back safely"
 * has one implementation, not two that could disagree (LG-03).
 */
export function resolveInitialVariant<T extends VariantForDefault & Pick<ProductVariant, 'id'>>(
  variants: T[],
  variantIdParam?: string | null,
): T {
  if (variantIdParam) {
    const match = variants.find((v) => v.id === variantIdParam)
    if (match) return match
  }
  return getDefaultVariant(variants)
}
