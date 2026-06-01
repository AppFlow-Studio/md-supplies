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
    description: 'Exam gloves, wound care, diagnostics, and testing supplies.',
    image: 'https://www.figma.com/api/mcp/asset/945dd7c5-715c-47e9-aca9-041bfa7e8af7',
  },
  {
    name: 'HRT Clinics',
    slug: 'hrt-clinics',
    collectionHandle: 'hrt-clinics',
    description: 'Trocar kits, syringes, needles, and specialized hormone supplies.',
    image: 'https://www.figma.com/api/mcp/asset/cca76797-f0a7-43e5-a222-aaa09b5ee04b',
  },
  {
    name: 'EMS & First Responders',
    slug: 'ems',
    collectionHandle: 'ems',
    description: 'First responder bags, trauma supplies, and emergency kits.',
    image: 'https://www.figma.com/api/mcp/asset/71a2cb23-2047-4c3a-802c-eed97241ab20',
  },
  {
    name: 'Home Health',
    slug: 'home-health',
    collectionHandle: 'home-health',
    description: 'Incontinence, wound care, and daily living aids.',
    image: 'https://www.figma.com/api/mcp/asset/0f2a3758-05f9-43c4-8d28-6638add9f893',
  },
  {
    name: 'Long-Term Care',
    slug: 'long-term-care',
    collectionHandle: 'long-term-care',
    description: 'Bulk supplies for nursing homes and assisted living facilities.',
    image: 'https://www.figma.com/api/mcp/asset/6af5fee4-a9c5-40c2-adb5-fa74a1b1d123',
  },
  {
    name: 'Physical Therapy',
    slug: 'physical-therapy',
    collectionHandle: 'physical-therapy',
    description: 'Mobility equipment and therapy rehabilitation aids.',
    image: 'https://www.figma.com/api/mcp/asset/1460eae8-a745-4069-9b03-ec6c0aa66d3e',
  },
  {
    name: 'Private Practice',
    slug: 'private-practice',
    collectionHandle: 'private-practice',
    description: 'Exam room essentials, diagnostics, and office supplies.',
    image: 'https://www.figma.com/api/mcp/asset/11afc1ac-ebda-492a-b207-fd5ebf1f011e',
  },
  {
    name: 'Dental',
    slug: 'dental',
    collectionHandle: 'dental',
    description: 'Gloves, sterilization, barriers, and instruments.',
    image: 'https://www.figma.com/api/mcp/asset/056e863a-9c1f-438f-b82a-193c15217412',
  },
  {
    name: 'Veterinary',
    slug: 'veterinary',
    collectionHandle: 'veterinary',
    description: 'Syringes, gloves, and veterinary wound care.',
    image: 'https://www.figma.com/api/mcp/asset/2f348537-3f67-4143-8590-1301741bd382',
  },
  {
    name: 'Community Health',
    slug: 'community-health',
    collectionHandle: 'community-health',
    description: 'Affordable supplies for nonprofits and free clinics.',
    image: 'https://www.figma.com/api/mcp/asset/39b439c4-4ab1-475d-ba23-32103852595a',
  },
]
