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
