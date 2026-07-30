import type { FAQItem } from './seoTypes'

export interface PartnerSeoData {
  title: string
  metaDescription: string
  answerBlock: string
  faqs: FAQItem[]
}

// Keyed by partner slug.
const PARTNER_SEO_DB: Record<string, PartnerSeoData> = {
  'drive-medical': {
    title: 'Drive Medical Equipment | Wheelchairs & Mobility Aids | MDSupplies',
    metaDescription:
      'Shop Drive Medical wheelchairs, walkers, rollators, and durable medical equipment at wholesale prices through MDSupplies for healthcare providers and home health agencies.',
    answerBlock:
      'Drive Medical designs durable medical equipment trusted by healthcare facilities and home health providers worldwide. MDSupplies carries Drive Medical wheelchairs, walkers, and patient aids at wholesale pricing.',
    faqs: [
      {
        question: 'What Drive Medical products are available through MDSupplies?',
        answer:
          'MDSupplies carries Drive Medical wheelchairs, transport chairs, rollators, walkers, and patient aids. Browse the Drive Medical partner page or the mobility category for available products.',
      },
      {
        question: 'Is Drive Medical equipment available at wholesale pricing?',
        answer:
          'Yes. Drive Medical products are available to qualified healthcare providers and home health agencies at wholesale pricing through MDSupplies.',
      },
      {
        question: 'Does Drive Medical offer bariatric mobility equipment?',
        answer:
          'Drive Medical manufactures bariatric wheelchairs, transport chairs, and patient aids rated for higher weight capacities. Contact our team to confirm availability for specific bariatric models.',
      },
    ],
  },

  'ad-surgical': {
    title: 'AD Surgical Sutures & Wound Closure | MDSupplies',
    metaDescription:
      'Shop AD Surgical sutures, wound closure strips, staples, and procedure kits at wholesale prices through MDSupplies for urgent care and surgical facilities.',
    answerBlock:
      'AD Surgical offers a comprehensive portfolio of sutures, wound closure strips, staples, and procedure kits for clinical precision. MDSupplies stocks AD Surgical products at wholesale pricing.',
    faqs: [
      {
        question: 'What AD Surgical products are available through MDSupplies?',
        answer:
          'MDSupplies carries AD Surgical sutures, wound closure strips, surgical staples, and procedure kits. Browse the AD Surgical partner page or the surgical sutures category for available products.',
      },
      {
        question: 'Are AD Surgical products available in bulk?',
        answer:
          'Yes. AD Surgical sutures and wound closure products are available in bulk quantities for qualified healthcare facilities. Contact our B2B team for volume pricing.',
      },
    ],
  },

  'dukal': {
    title: 'Dukal Medical Products | Wound Care & Disposables | MDSupplies',
    metaDescription:
      'Shop Dukal wound care, surgical, and disposable medical products at wholesale prices through MDSupplies — gauze, dressings, exam gloves, and surgical drapes.',
    answerBlock:
      'Dukal manufactures high-quality disposable medical products including gauze sponges, wound dressings, exam gloves, and surgical drapes trusted by healthcare facilities across the United States.',
    faqs: [
      {
        question: 'What Dukal products does MDSupplies carry?',
        answer:
          'MDSupplies carries Dukal wound care supplies, exam gloves, surgical drapes, and disposable medical products. Browse the Dukal partner page or relevant categories for available products.',
      },
      {
        question: 'Are Dukal products available at wholesale pricing?',
        answer:
          'Yes. Dukal wound care and disposable medical products are available at wholesale pricing through MDSupplies for healthcare facilities, urgent care centers, and home health agencies.',
      },
    ],
  },

  'dynarex': {
    title: 'Dynarex Medical Products | Gloves & Disposables | MDSupplies',
    metaDescription:
      'Shop Dynarex gloves, wound care, and disposable medical supplies at wholesale prices through MDSupplies — one of the largest medical product manufacturers in the US.',
    answerBlock:
      'Dynarex is one of the largest US manufacturers of general medical products, offering thousands of SKUs across gloves, wound care, PPE, and exam room essentials available through MDSupplies.',
    faqs: [
      {
        question: 'What Dynarex products are available through MDSupplies?',
        answer:
          'MDSupplies carries Dynarex exam gloves, wound care supplies, PPE, and exam room consumables. Browse the Dynarex partner page or relevant categories for available products.',
      },
      {
        question: 'Does Dynarex offer nitrile gloves in bulk?',
        answer:
          'Yes. Dynarex nitrile exam gloves are available in box and case quantities through MDSupplies for healthcare facilities requiring high-volume glove purchasing.',
      },
    ],
  },
}

export function getPartnerSeo(slug: string): PartnerSeoData | undefined {
  return PARTNER_SEO_DB[slug]
}
