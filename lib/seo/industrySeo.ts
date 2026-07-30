import type { FAQItem } from './seoTypes'

export interface IndustrySeoOverride {
  title: string
  metaDescription: string
  answerBlock: string
  additionalFaqs?: FAQItem[]
}

// Keyed by industry slug.
const INDUSTRY_SEO_DB: Record<string, IndustrySeoOverride> = {
  'urgent-care': {
    title: 'Urgent Care Medical Supplies | Bulk Ordering | MDSupplies',
    metaDescription:
      'Wholesale medical supplies for urgent care centers — exam gloves, wound care, rapid diagnostic tests, and IV supplies with bulk ordering and B2B account options.',
    answerBlock:
      'MDSupplies supplies urgent care centers with exam gloves, wound care dressings, rapid test kits, and IV supplies at wholesale prices with bulk ordering and dedicated B2B account support.',
  },

  'pharmacies': {
    title: 'Pharmacy Medical Supplies | Wholesale Pricing | MDSupplies',
    metaDescription:
      'Wholesale pharmacy supplies for retail and compounding pharmacies — prescription vials, diabetic care, incontinence products, and front-end medical supply inventory.',
    answerBlock:
      'MDSupplies helps pharmacies stock front-end medical supply inventory including diabetic care supplies, incontinence products, wound care, and dispensing accessories at wholesale pricing.',
  },

  'hrt-clinics': {
    title: 'HRT Clinic Medical Supplies | Trocars & Syringes | MDSupplies',
    metaDescription:
      'Wholesale supplies for HRT clinics — trocar kits, needles, syringes, and specialized injection supplies for pellet insertion and hormone therapy procedures.',
    answerBlock:
      'MDSupplies carries trocar kits, needles, syringes, and procedure supplies for hormone replacement therapy clinics at wholesale prices with bulk ordering options.',
  },

  'home-health': {
    title: 'Home Health Medical Supplies | Agency Pricing | MDSupplies',
    metaDescription:
      'Wholesale home health supplies for agencies and visiting nurses — wound care dressings, incontinence products, gloves, and mobility aids with agency-level purchasing.',
    answerBlock:
      'MDSupplies supports home health agencies with wound care, incontinence supplies, gloves, and mobility aids at wholesale prices with agency-level purchasing and account management.',
  },

  'clinics-doctors-offices': {
    title: 'Clinic & Doctor Office Supplies | Wholesale | MDSupplies',
    metaDescription:
      'Wholesale medical supplies for clinics and private practices — exam room essentials, gloves, diagnostic supplies, and consumables with bulk pricing and recurring order options.',
    answerBlock:
      'MDSupplies supplies clinics and physician offices with exam room consumables, diagnostic supplies, gloves, and wound care materials at wholesale prices with bulk and recurring order options.',
  },
}

export function getIndustrySeo(slug: string): IndustrySeoOverride | undefined {
  return INDUSTRY_SEO_DB[slug]
}
