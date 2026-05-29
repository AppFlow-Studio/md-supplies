export type Industry = {
  name: string
  slug: string
  collectionHandle: string
  description: string
  image: string
}

export const INDUSTRIES: Industry[] = [
  {
    name: 'Urgent Care',
    slug: 'urgent-care',
    collectionHandle: 'urgent-care',
    description: 'Essential supplies for fast-paced urgent care environments.',
    image: 'https://www.figma.com/api/mcp/asset/bce9ec8d-dd4e-4faf-85b1-f47ce6d1124c',
  },
  {
    name: 'EMS',
    slug: 'ems',
    collectionHandle: 'ems',
    description: 'Reliable equipment for emergency medical services.',
    image: 'https://www.figma.com/api/mcp/asset/b6de8838-e64a-4bf2-9ef1-cff96d90b28d',
  },
  {
    name: 'Pharmacy',
    slug: 'pharmacy',
    collectionHandle: 'pharmacy',
    description: 'Pharmacy-grade supplies for dispensing and patient care.',
    image: 'https://www.figma.com/api/mcp/asset/46383ec7-9c26-4ab3-9a2a-66fed0db01d5',
  },
  {
    name: 'Physical Therapy',
    slug: 'physical-therapy',
    collectionHandle: 'physical-therapy',
    description: 'Rehabilitation supplies for physical therapy practices.',
    image: 'https://www.figma.com/api/mcp/asset/f5c0d0c8-247d-4cbb-8cf5-c2756abc5171',
  },
]
