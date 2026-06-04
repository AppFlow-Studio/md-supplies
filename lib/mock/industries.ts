import type { Industry } from '@/types/industry'

export const mockIndustries: Industry[] = [
  {
    slug: 'pharmacy',
    name: 'Pharmacy',
    isPopulated: true,
    intro: 'From compounding supplies to retail pharmacy essentials, MDSupplies stocks everything your pharmacy needs to serve patients efficiently and safely.',
    heroImage: {
      url: 'https://placehold.co/1200x400/e5eff7/0086b1?text=Pharmacy+Supplies',
      altText: 'Pharmacy supply counter with medications and supplies',
    },
    relevantCategories: [
      { handle: 'prescription-supplies', title: 'Prescription Supplies' },
      { handle: 'compounding', title: 'Compounding Supplies' },
      { handle: 'otc-products', title: 'OTC Products' },
    ],
    relevantSubcategories: [
      { handle: 'vials-syringes', title: 'Vials & Syringes' },
      { handle: 'pill-bottles', title: 'Pill Bottles & Caps' },
      { handle: 'labels', title: 'Pharmacy Labels' },
    ],
    relevantProducts: [
      { handle: 'nitrile-exam-gloves-powder-free', title: 'Nitrile Exam Gloves', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Gloves', price: 2499 },
      { handle: 'disposable-bed-pads', title: 'Disposable Bed Pads', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Bed+Pads', price: 3299 },
      { handle: 'nasal-cannula-adult', title: 'Nasal Cannula', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Cannula', price: 199 },
    ],
    relatedGuides: [
      { slug: 'pharmacy-supply-checklist', title: 'Essential Pharmacy Supply Checklist' },
      { slug: 'compounding-sterile-supplies', title: 'Sterile Compounding Supply Guide' },
    ],
    ctaText: 'Browse Pharmacy Supplies',
    ctaLink: '/category/prescription-supplies',
    faq: [
      { question: 'Do you offer bulk pricing for pharmacies?', answer: 'Yes, MDSupplies offers tiered wholesale pricing for licensed pharmacies. Contact our B2B team for a custom quote.' },
      { question: 'Are your compounding supplies USP-compliant?', answer: 'All compounding supplies we carry meet USP 795 and USP 797 standards where applicable.' },
    ],
    seoTitle: 'Pharmacy Supplies — MDSupplies',
    seoDescription: 'Wholesale pharmacy supplies including compounding materials, prescription containers, syringes, and OTC essentials.',
  },
  {
    slug: 'urgent-care',
    name: 'Urgent Care',
    isPopulated: true,
    intro: 'Equip your urgent care center with the high-volume disposables, diagnostic tools, and exam room supplies needed to move patients efficiently.',
    heroImage: {
      url: 'https://placehold.co/1200x400/f0fdf4/166534?text=Urgent+Care+Supplies',
      altText: 'Urgent care exam room with medical supplies',
    },
    relevantCategories: [
      { handle: 'exam-room', title: 'Exam Room Supplies' },
      { handle: 'wound-care', title: 'Wound Care' },
      { handle: 'diagnostic', title: 'Diagnostic Supplies' },
    ],
    relevantSubcategories: [
      { handle: 'exam-gloves', title: 'Exam Gloves' },
      { handle: 'bandages', title: 'Bandages & Dressings' },
      { handle: 'otoscopes', title: 'Otoscopes & Scopes' },
    ],
    relevantProducts: [
      { handle: 'nitrile-exam-gloves-powder-free', title: 'Nitrile Exam Gloves', image: 'https://placehold.co/400x400/f0fdf4/166534?text=Gloves', price: 2499 },
      { handle: 'latex-exam-gloves-powder-free', title: 'Latex Exam Gloves', image: 'https://placehold.co/400x400/f0fdf4/166534?text=Latex', price: 2299 },
      { handle: 'standard-walker', title: 'Standard Walker', image: 'https://placehold.co/400x400/f0fdf4/166534?text=Walker', price: 4999 },
    ],
    relatedGuides: [
      { slug: 'urgent-care-supply-checklist', title: 'Urgent Care Supply Checklist' },
    ],
    ctaText: 'Browse Urgent Care Supplies',
    ctaLink: '/category/exam-room',
    faq: [
      { question: 'Can I set up a standing order for high-volume items?', answer: 'Yes, we support recurring orders for exam gloves, gauze, and other high-velocity items. Contact our team to set up a standing order.' },
    ],
    seoTitle: 'Urgent Care Supplies — MDSupplies',
    seoDescription: 'Wholesale urgent care supplies: exam gloves, wound care, diagnostic tools, and exam room essentials for high-volume urgent care centers.',
  },
  {
    slug: 'dental',
    name: 'Dental',
    isPopulated: false,
    intro: 'Dental supplies for practices of all sizes.',
    relevantCategories: [],
    relevantSubcategories: [],
    relevantProducts: [],
    relatedGuides: [],
    ctaText: 'Browse Dental Supplies',
    ctaLink: '/category/dental',
  },
  {
    slug: 'long-term-care',
    name: 'Long-Term Care',
    isPopulated: false,
    intro: 'Supplies for skilled nursing facilities and long-term care communities.',
    relevantCategories: [],
    relevantSubcategories: [],
    relevantProducts: [],
    relatedGuides: [],
    ctaText: 'Browse Long-Term Care Supplies',
    ctaLink: '/category/long-term-care',
  },
]

export function getIndustryBySlug(slug: string): Industry | undefined {
  return mockIndustries.find((i) => i.slug === slug)
}

export function generateIndustrySlugs(): { 'industry-slug': string }[] {
  return mockIndustries.map((i) => ({ 'industry-slug': i.slug }))
}
