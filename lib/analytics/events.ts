import type { CollectionProduct } from '@/lib/shopify/types'

export interface GA4Item {
  item_id: string
  item_name: string
  price: number
  item_brand?: string
  quantity?: number
  index?: number
  item_list_id?: string
  item_list_name?: string
}

export interface GA4EcommerceEvent {
  event: 'view_item' | 'view_item_list' | 'select_item' | 'add_to_cart' | 'view_cart' | 'begin_checkout'
  ecommerce: {
    currency: string
    value: number
    items: GA4Item[]
  }
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
    item_brand: product.vendor,
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

export type AnalyticsEvent = GA4EcommerceEvent | PageViewEvent | FormSubmitEvent

export function buildFormSubmitEvent(params: { formName: string; details?: Record<string, string> }): FormSubmitEvent {
  return { event: 'form_submit', form_name: params.formName, ...(params.details ?? {}) }
}
