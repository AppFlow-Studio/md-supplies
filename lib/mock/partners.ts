import type { Partner } from '@/types/partner'

export const mockPartners: Partner[] = [
  {
    slug: 'dawn-mist',
    name: 'Dawn Mist',
    type: 'brand',
    isActive: true,
    description: 'Premium personal care and hygiene products for healthcare facilities.',
    logo: {
      url: 'https://placehold.co/200x80/e5eff7/0086b1?text=Dawn+Mist',
      altText: 'Dawn Mist logo',
      width: 200,
      height: 80,
    },
    intro: 'Dawn Mist is a leading brand of personal care products trusted by hospitals and long-term care facilities across North America.',
    productCategories: ['personal-care', 'hygiene', 'bath-supplies'],
    featuredProducts: [
      { handle: 'nitrile-exam-gloves-powder-free', title: 'Nitrile Exam Gloves', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Gloves', price: 2499 },
      { handle: 'disposable-bed-pads', title: 'Disposable Bed Pads', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Bed+Pads', price: 3299 },
    ],
    relatedCategories: [
      { handle: 'personal-care', title: 'Personal Care' },
      { handle: 'hygiene', title: 'Hygiene Supplies' },
    ],
    seoTitle: 'Dawn Mist Products — MDSupplies Partner',
    seoDescription: 'Browse Dawn Mist personal care and hygiene products available at wholesale prices through MDSupplies.',
  },
  {
    slug: 'lumex',
    name: 'Lumex',
    type: 'brand',
    isActive: true,
    description: 'Durable medical equipment and mobility aids for patient care.',
    logo: {
      url: 'https://placehold.co/200x80/f0fdf4/166534?text=Lumex',
      altText: 'Lumex logo',
      width: 200,
      height: 80,
    },
    intro: 'Lumex specializes in durable medical equipment including walkers, wheelchairs, and patient lifts used in home care and clinical settings.',
    productCategories: ['dme', 'mobility-aids', 'patient-lifts'],
    featuredProducts: [
      { handle: 'standard-walker', title: 'Standard Walker', image: 'https://placehold.co/400x400/f0fdf4/166534?text=Walker', price: 4999 },
      { handle: 'transport-wheelchair', title: 'Transport Wheelchair', image: 'https://placehold.co/400x400/f0fdf4/166534?text=Wheelchair', price: 8999 },
    ],
    relatedCategories: [
      { handle: 'dme', title: 'Durable Medical Equipment' },
      { handle: 'mobility-aids', title: 'Mobility Aids' },
    ],
  },
  {
    slug: 'dynao2',
    name: 'DynaO2',
    type: 'brand',
    isActive: true,
    description: 'Respiratory therapy and oxygen delivery products for clinical use.',
    logo: {
      url: 'https://placehold.co/200x80/fef9c3/854d0e?text=DynaO2',
      altText: 'DynaO2 logo',
      width: 200,
      height: 80,
    },
    intro: 'DynaO2 manufactures respiratory therapy products including nasal cannulas, oxygen masks, and nebulizer kits for hospitals and home health agencies.',
    productCategories: ['respiratory', 'oxygen-therapy'],
    featuredProducts: [
      { handle: 'nasal-cannula-adult', title: 'Nasal Cannula, Adult', image: 'https://placehold.co/400x400/fef9c3/854d0e?text=Cannula', price: 199 },
      { handle: 'simple-face-mask', title: 'Simple Face Mask', image: 'https://placehold.co/400x400/fef9c3/854d0e?text=Face+Mask', price: 299 },
    ],
    relatedCategories: [
      { handle: 'respiratory', title: 'Respiratory Supplies' },
      { handle: 'oxygen-therapy', title: 'Oxygen Therapy' },
    ],
  },
  {
    slug: 'dukal',
    name: 'Dukal',
    type: 'vendor',
    isActive: false,
    description: 'Medical supply distributor specializing in wound care and surgical products.',
    logo: {
      url: 'https://placehold.co/200x80/fce7f3/9d174d?text=Dukal',
      altText: 'Dukal logo',
      width: 200,
      height: 80,
    },
    intro: 'Dukal is a leading distributor of wound care, surgical, and exam room supplies to healthcare facilities nationwide.',
    productCategories: ['wound-care', 'surgical', 'exam-room'],
    featuredProducts: [],
    relatedBrands: ['dawn-mist'],
    relatedCategories: [{ handle: 'wound-care', title: 'Wound Care' }],
  },
  {
    slug: 'graham-field',
    name: 'Graham Field',
    type: 'vendor',
    isActive: true,
    description: 'Full-line distributor of durable medical equipment and rehabilitation products.',
    logo: {
      url: 'https://placehold.co/200x80/ede9fe/5b21b6?text=Graham+Field',
      altText: 'Graham Field logo',
      width: 200,
      height: 80,
    },
    intro: 'Graham Field is a comprehensive distributor of DME, rehabilitation, and patient-care products, supplying healthcare facilities and home care agencies.',
    productCategories: ['dme', 'rehabilitation', 'patient-care'],
    featuredProducts: [
      { handle: 'standard-walker', title: 'Standard Walker', image: 'https://placehold.co/400x400/ede9fe/5b21b6?text=Walker', price: 4999 },
      { handle: 'disposable-bed-pads', title: 'Disposable Bed Pads', image: 'https://placehold.co/400x400/ede9fe/5b21b6?text=Bed+Pads', price: 3299 },
    ],
    relatedBrands: ['lumex'],
    relatedCategories: [
      { handle: 'dme', title: 'Durable Medical Equipment' },
      { handle: 'rehabilitation', title: 'Rehabilitation' },
    ],
  },
  {
    slug: 'dynarex',
    name: 'Dynarex',
    type: 'vendor',
    isActive: true,
    description: 'High-volume distributor of disposable medical products for all care settings.',
    logo: {
      url: 'https://placehold.co/200x80/dbeafe/1d4ed8?text=Dynarex',
      altText: 'Dynarex logo',
      width: 200,
      height: 80,
    },
    intro: 'Dynarex distributes a wide range of disposable medical products including gloves, wound care, and personal protective equipment to healthcare facilities at competitive prices.',
    productCategories: ['disposables', 'wound-care', 'ppe'],
    featuredProducts: [
      { handle: 'nitrile-exam-gloves-powder-free', title: 'Nitrile Exam Gloves', image: 'https://placehold.co/400x400/dbeafe/1d4ed8?text=Gloves', price: 2499 },
      { handle: 'latex-exam-gloves-powder-free', title: 'Latex Exam Gloves', image: 'https://placehold.co/400x400/dbeafe/1d4ed8?text=Latex+Gloves', price: 2299 },
    ],
    relatedBrands: ['dawn-mist', 'dynao2'],
    relatedCategories: [
      { handle: 'disposables', title: 'Disposables' },
      { handle: 'ppe', title: 'PPE' },
    ],
  },
]

export function getActivePartners(): Partner[] {
  return mockPartners.filter((p) => p.isActive)
}

export function getPartnerBySlug(slug: string): Partner | undefined {
  return mockPartners.find((p) => p.slug === slug)
}
