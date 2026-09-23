/**
 * TrustShop requires an integer Shopify product ID; the Storefront API only
 * ever hands us a GID (`gid://shopify/Product/7857484955713`). This is the
 * single conversion point — every TrustShop call site converts here, never by
 * parsing a handle/title/SKU/variant.
 */
export function getNumericShopifyProductId(gid: string): number {
  const id = gid.split('/').pop()
  if (!id || !/^\d+$/.test(id)) throw new Error('Invalid Shopify product ID')
  const parsed = Number(id)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error('Invalid Shopify product ID')
  return parsed
}
