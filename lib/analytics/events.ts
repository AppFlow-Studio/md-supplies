import type { CartLine, CollectionProduct } from '@/lib/shopify/types'
import { publicBrand } from '@/lib/brand'

export interface GA4Item {
  /** Shopify ProductVariant GID. Deliberately the variant, not the SKU and
      not the parent product: it is the one identifier that is unique per
      purchasable thing AND identical to what the Shopify checkout pixel
      reports on `purchase` (shopify/web-pixel-purchase.js reads
      `lineItem.variant.id`), so pre-purchase and purchase events join. */
  item_id: string
  item_name: string
  price: number
  item_brand?: string
  /** Variant option label ("3.5mm", "Blue / Large"). GA4 standard param. */
  item_variant?: string
  /** Merchant SKU. NOT a GA4 standard param — register it as a custom item
      dimension in GA4 Admin to report on it. Kept alongside `item_id` rather
      than replacing it because Shopify's Google & YouTube app publishes
      Merchant Center IDs off the variant ID, and swapping the key would both
      break that join and discontinue existing GA4 item history. */
  item_sku?: string
  item_category?: string
  quantity?: number
  index?: number
  item_list_id?: string
  item_list_name?: string
}

export interface GA4EcommerceEvent {
  event:
    | 'view_item'
    | 'view_item_list'
    | 'select_item'
    | 'add_to_cart'
    | 'remove_from_cart'
    | 'view_cart'
    | 'begin_checkout'
  ecommerce: {
    currency: string
    value: number
    items: GA4Item[]
  }
}

/** GA4 recommended `search` event. Carries no ecommerce object. */
export interface SearchEvent {
  event: 'search'
  search_term: string
  /** Result count, so a zero-result search is distinguishable in reporting. */
  results: number
}

export interface PageViewEvent {
  event: 'page_view'
  page_path: string
  page_location: string
  page_title: string
}

export interface FormSubmitEvent {
  event: 'form_submit'
  form_name: string
  [key: string]: unknown
}

function firstVariant(product: CollectionProduct) {
  return product.variants.nodes[0]
}

export function toGA4Item(product: CollectionProduct): GA4Item {
  const variant = firstVariant(product)
  return {
    item_id: variant?.id ?? product.id,
    item_name: product.title,
    price: parseFloat(variant?.price.amount ?? product.priceRange.minVariantPrice.amount),
    // Public brand only — `vendor` is the fulfilling vendor and must not be
    // reported as a brand (lib/brand.ts). Omitted when none is approved.
    ...(publicBrand(product) ? { item_brand: publicBrand(product)! } : {}),
  }
}

export function currencyOf(product: CollectionProduct): string {
  const variant = firstVariant(product)
  return variant?.price.currencyCode ?? product.priceRange.minVariantPrice.currencyCode
}

function sumItemValue(items: GA4Item[]): number {
  return items.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0)
}

export function buildPageViewEvent(params: { path: string; location: string; title: string }): PageViewEvent {
  return {
    event: 'page_view',
    page_path: params.path,
    page_location: params.location,
    page_title: params.title,
  }
}

export function buildViewItemEvent(params: { currency: string; item: GA4Item }): GA4EcommerceEvent {
  return {
    event: 'view_item',
    ecommerce: { currency: params.currency, value: params.item.price, items: [params.item] },
  }
}

export function buildViewItemListEvent(params: {
  currency: string
  itemListId: string
  itemListName: string
  items: GA4Item[]
}): GA4EcommerceEvent {
  const items = params.items.map((item, index) => ({
    ...item,
    index,
    item_list_id: params.itemListId,
    item_list_name: params.itemListName,
  }))
  return {
    event: 'view_item_list',
    ecommerce: { currency: params.currency, value: sumItemValue(items), items },
  }
}

export function buildSelectItemEvent(params: {
  currency: string
  itemListId: string
  itemListName: string
  item: GA4Item
  index: number
}): GA4EcommerceEvent {
  const item: GA4Item = {
    ...params.item,
    index: params.index,
    item_list_id: params.itemListId,
    item_list_name: params.itemListName,
  }
  return {
    event: 'select_item',
    ecommerce: { currency: params.currency, value: item.price, items: [item] },
  }
}

export function buildAddToCartEvent(params: { currency: string; item: GA4Item }): GA4EcommerceEvent {
  return {
    event: 'add_to_cart',
    ecommerce: {
      currency: params.currency,
      value: params.item.price * (params.item.quantity ?? 1),
      items: [params.item],
    },
  }
}

export function buildRemoveFromCartEvent(params: { currency: string; items: GA4Item[] }): GA4EcommerceEvent {
  return {
    event: 'remove_from_cart',
    ecommerce: { currency: params.currency, value: sumItemValue(params.items), items: params.items },
  }
}

export function buildSearchEvent(params: { term: string; results: number }): SearchEvent {
  return { event: 'search', search_term: params.term, results: params.results }
}

export function buildViewCartEvent(params: { currency: string; items: GA4Item[] }): GA4EcommerceEvent {
  return {
    event: 'view_cart',
    ecommerce: { currency: params.currency, value: sumItemValue(params.items), items: params.items },
  }
}

export function buildBeginCheckoutEvent(params: { currency: string; items: GA4Item[] }): GA4EcommerceEvent {
  return {
    event: 'begin_checkout',
    ecommerce: { currency: params.currency, value: sumItemValue(params.items), items: params.items },
  }
}

export function buildFormSubmitEvent(params: { formName: string; details?: Record<string, string> }): FormSubmitEvent {
  return { event: 'form_submit', form_name: params.formName, ...(params.details ?? {}) }
}

// Favorites (DEV-FAV-01). Non-PII: item_id is the public Shopify product GID
// (already sent on every other GA4Item event on the site) — never a customer
// ID. `list` says which surface the action happened on (pdp/card/account) so
// the two required surfaces can be told apart in reporting without a second
// event name per surface.
export interface FavoriteEvent {
  event: 'favorite_add' | 'favorite_remove' | 'favorite_auth_prompt' | 'favorite_to_cart'
  item_id: string
  list: 'pdp' | 'card' | 'account'
}

export type AnalyticsEvent =
  | GA4EcommerceEvent
  | SearchEvent
  | PageViewEvent
  | FormSubmitEvent
  | FavoriteEvent

export function buildFavoriteEvent(params: {
  action: 'add' | 'remove' | 'auth_prompt' | 'to_cart'
  productId: string
  list: FavoriteEvent['list']
}): FavoriteEvent {
  return {
    event: `favorite_${params.action}` as FavoriteEvent['event'],
    item_id: params.productId,
    list: params.list,
  }
}


/**
 * The single mapper from a Shopify cart line to a GA4 item.
 *
 * Replaces four hand-rolled copies of this arithmetic (CartProvider ×2,
 * CartPopup, CartPageClient) that had drifted into omitting SKU, variant and
 * brand. Centralised so add_to_cart / remove_from_cart / view_cart /
 * begin_checkout describe the same line identically.
 *
 * `price` is the per-unit price. It is derived from `cost.totalAmount /
 * quantity` rather than read from `merchandise.price` on purpose: totalAmount
 * is what Shopify will actually charge for the line (it carries line-level
 * discounts), so the GA4 `value` matches the eventual order. The fallback to
 * `merchandise.price` covers the DEV-LAUNCH-09 case where Shopify zeroes
 * totalAmount because it has no shipping rate for the destination — reporting
 * $0 there would understate the funnel.
 *
 * `quantityOverride` exists for add_to_cart, where the interesting quantity is
 * the number just added, not the line's new running total.
 */
export function cartLineToGA4Item(line: CartLine, quantityOverride?: number): GA4Item {
  const lineTotal = parseFloat(line.cost.totalAmount.amount)
  const unit =
    Number.isFinite(lineTotal) && lineTotal > 0 && line.quantity > 0
      ? lineTotal / line.quantity
      : parseFloat(line.merchandise.price.amount)
  const variantTitle = line.merchandise.title
  return {
    item_id: line.merchandise.id,
    item_name: line.merchandise.product.title,
    price: Number.isFinite(unit) ? unit : 0,
    quantity: quantityOverride ?? line.quantity,
    // Shopify names a single-variant product's only variant "Default Title".
    // That is a storage artefact, not something a report should show.
    ...(variantTitle && variantTitle !== 'Default Title' ? { item_variant: variantTitle } : {}),
    ...(line.merchandise.sku ? { item_sku: line.merchandise.sku } : {}),
  }
}

/** Currency for a whole cart, taken from the authoritative Shopify subtotal. */
export function cartCurrency(cart: { cost: { subtotalAmount: { currencyCode: string } } }): string {
  return cart.cost.subtotalAmount.currencyCode
}
