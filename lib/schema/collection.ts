interface CollectionPageInput {
  name: string
  url: string
  description?: string
  image?: string
}

export function buildCollectionPageSchema(input: CollectionPageInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    url: input.url,
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: input.image } : {}),
  }
}

interface ItemListProduct {
  title: string
  handle: string
}

/**
 * ItemList of the products visible on a category page (audit L16) — position
 * continues across pages so page 2 starts where page 1 ended. Name + url only,
 * per Google's carousel guidance for summary pages; the full Product schema
 * lives on the product page itself.
 */
export function buildCollectionItemListSchema(
  products: ItemListProduct[],
  productUrl: (handle: string) => string,
  startPosition: number = 1,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: startPosition + i,
      name: p.title,
      url: productUrl(p.handle),
    })),
  }
}
