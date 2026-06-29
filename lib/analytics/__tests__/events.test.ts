import { describe, it, expect } from 'vitest'
import type { CollectionProduct } from '@/lib/shopify/types'
import {
  toGA4Item,
  currencyOf,
  buildPageViewEvent,
  buildViewItemEvent,
  buildViewItemListEvent,
  buildSelectItemEvent,
  buildAddToCartEvent,
  buildViewCartEvent,
  buildBeginCheckoutEvent,
  buildFormSubmitEvent,
} from '../events'

function makeProduct(overrides: Partial<CollectionProduct> = {}): CollectionProduct {
  return {
    id: 'gid://shopify/Product/1',
    title: 'Nitrile Exam Gloves',
    handle: 'nitrile-exam-gloves',
    vendor: 'MedBrand',
    availableForSale: true,
    tags: [],
    priceRange: {
      minVariantPrice: { amount: '19.99', currencyCode: 'USD' },
      maxVariantPrice: { amount: '19.99', currencyCode: 'USD' },
    },
    images: { nodes: [] },
    variants: {
      nodes: [
        {
          id: 'gid://shopify/ProductVariant/10',
          title: 'Default Title',
          price: { amount: '19.99', currencyCode: 'USD' },
          compareAtPrice: null,
          availableForSale: true,
          quantityAvailable: 50,
        },
      ],
    },
    ...overrides,
  }
}

describe('toGA4Item', () => {
  it('maps a CollectionProduct to a GA4 item using the first variant price', () => {
    expect(toGA4Item(makeProduct())).toEqual({
      item_id: 'gid://shopify/ProductVariant/10',
      item_name: 'Nitrile Exam Gloves',
      price: 19.99,
      item_brand: 'MedBrand',
    })
  })

  it('falls back to priceRange and product id when there is no variant', () => {
    const product = makeProduct({ variants: { nodes: [] } })
    expect(toGA4Item(product)).toEqual({
      item_id: 'gid://shopify/Product/1',
      item_name: 'Nitrile Exam Gloves',
      price: 19.99,
      item_brand: 'MedBrand',
    })
  })
})

describe('currencyOf', () => {
  it('reads currency from the first variant', () => {
    expect(currencyOf(makeProduct())).toBe('USD')
  })

  it('falls back to priceRange currency when there is no variant', () => {
    expect(currencyOf(makeProduct({ variants: { nodes: [] } }))).toBe('USD')
  })
})

describe('buildPageViewEvent', () => {
  it('builds a page_view event from path/location/title', () => {
    expect(
      buildPageViewEvent({ path: '/category/gloves?sort=PRICE_ASC', location: 'https://mdsupplies.com/category/gloves?sort=PRICE_ASC', title: 'Gloves | MD Supplies' }),
    ).toEqual({
      event: 'page_view',
      page_path: '/category/gloves?sort=PRICE_ASC',
      page_location: 'https://mdsupplies.com/category/gloves?sort=PRICE_ASC',
      page_title: 'Gloves | MD Supplies',
    })
  })
})

describe('buildViewItemEvent', () => {
  it('wraps a single item with currency and value', () => {
    expect(
      buildViewItemEvent({ currency: 'USD', item: { item_id: 'v1', item_name: 'Gloves', price: 19.99 } }),
    ).toEqual({
      event: 'view_item',
      ecommerce: { currency: 'USD', value: 19.99, items: [{ item_id: 'v1', item_name: 'Gloves', price: 19.99 }] },
    })
  })
})

describe('buildViewItemListEvent', () => {
  it('stamps index and list metadata onto every item and sums value', () => {
    const items = [
      { item_id: 'v1', item_name: 'Gloves', price: 10 },
      { item_id: 'v2', item_name: 'Masks', price: 5 },
    ]
    expect(
      buildViewItemListEvent({ currency: 'USD', itemListId: 'gloves', itemListName: 'Gloves', items }),
    ).toEqual({
      event: 'view_item_list',
      ecommerce: {
        currency: 'USD',
        value: 15,
        items: [
          { item_id: 'v1', item_name: 'Gloves', price: 10, index: 0, item_list_id: 'gloves', item_list_name: 'Gloves' },
          { item_id: 'v2', item_name: 'Masks', price: 5, index: 1, item_list_id: 'gloves', item_list_name: 'Gloves' },
        ],
      },
    })
  })
})

describe('buildSelectItemEvent', () => {
  it('stamps index and list metadata onto the selected item', () => {
    expect(
      buildSelectItemEvent({
        currency: 'USD',
        itemListId: 'gloves',
        itemListName: 'Gloves',
        item: { item_id: 'v1', item_name: 'Gloves', price: 10 },
        index: 2,
      }),
    ).toEqual({
      event: 'select_item',
      ecommerce: {
        currency: 'USD',
        value: 10,
        items: [{ item_id: 'v1', item_name: 'Gloves', price: 10, index: 2, item_list_id: 'gloves', item_list_name: 'Gloves' }],
      },
    })
  })
})

describe('buildAddToCartEvent', () => {
  it('multiplies unit price by quantity for value', () => {
    expect(
      buildAddToCartEvent({ currency: 'USD', item: { item_id: 'v1', item_name: 'Gloves', price: 10, quantity: 3 } }),
    ).toEqual({
      event: 'add_to_cart',
      ecommerce: { currency: 'USD', value: 30, items: [{ item_id: 'v1', item_name: 'Gloves', price: 10, quantity: 3 }] },
    })
  })

  it('defaults quantity to 1 when omitted', () => {
    expect(
      buildAddToCartEvent({ currency: 'USD', item: { item_id: 'v1', item_name: 'Gloves', price: 10 } }),
    ).toMatchObject({ ecommerce: { value: 10 } })
  })
})

describe('buildViewCartEvent', () => {
  it('sums price * quantity across all items', () => {
    const items = [
      { item_id: 'v1', item_name: 'Gloves', price: 10, quantity: 2 },
      { item_id: 'v2', item_name: 'Masks', price: 5, quantity: 1 },
    ]
    expect(buildViewCartEvent({ currency: 'USD', items })).toEqual({
      event: 'view_cart',
      ecommerce: { currency: 'USD', value: 25, items },
    })
  })

  it('builds an empty cart view with zero value', () => {
    expect(buildViewCartEvent({ currency: 'USD', items: [] })).toEqual({
      event: 'view_cart',
      ecommerce: { currency: 'USD', value: 0, items: [] },
    })
  })
})

describe('buildBeginCheckoutEvent', () => {
  it('sums price * quantity across all items', () => {
    const items = [
      { item_id: 'v1', item_name: 'Gloves', price: 10, quantity: 2 },
      { item_id: 'v2', item_name: 'Masks', price: 5, quantity: 1 },
    ]
    expect(buildBeginCheckoutEvent({ currency: 'USD', items })).toEqual({
      event: 'begin_checkout',
      ecommerce: { currency: 'USD', value: 25, items },
    })
  })
})

describe('buildFormSubmitEvent', () => {
  it('builds a form_submit event with extra details merged in', () => {
    expect(buildFormSubmitEvent({ formName: 'contact', details: { subject: 'General inquiry' } })).toEqual({
      event: 'form_submit',
      form_name: 'contact',
      subject: 'General inquiry',
    })
  })

  it('works with no details', () => {
    expect(buildFormSubmitEvent({ formName: 'sourcing_request' })).toEqual({
      event: 'form_submit',
      form_name: 'sourcing_request',
    })
  })
})
