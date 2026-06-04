import type { OCCHub } from '@/types/occ'

export const mockOCCHub: OCCHub = {
  title: 'OCC Solutions',
  intro: 'The MDSupplies OCC program connects qualifying healthcare organizations with streamlined ordering, preferred pricing, and dedicated account support.',
  programExplanation: 'Our Organized Customer Care (OCC) program is designed for healthcare facilities that order regularly and need reliable supply chain partnerships. OCC members receive dedicated account management, priority fulfillment, and access to volume-based pricing tiers.',
  freeShippingMessage: 'OCC members with qualifying order volumes receive free standard shipping on eligible product categories.',
  eligibleCategories: [
    { handle: 'exam-gloves', title: 'Exam Gloves' },
    { handle: 'wound-care', title: 'Wound Care' },
    { handle: 'personal-care', title: 'Personal Care' },
    { handle: 'disposables', title: 'Disposables' },
  ],
  eligibleProducts: [
    { handle: 'nitrile-exam-gloves-powder-free', title: 'Nitrile Exam Gloves', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Nitrile+Gloves', price: 2499 },
    { handle: 'latex-exam-gloves-powder-free', title: 'Latex Exam Gloves', image: 'https://placehold.co/400x400/fef9c3/854d0e?text=Latex+Gloves', price: 2299 },
    { handle: 'disposable-bed-pads', title: 'Disposable Bed Pads', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Bed+Pads', price: 3299 },
    { handle: 'nasal-cannula-adult', title: 'Nasal Cannula, Adult', image: 'https://placehold.co/400x400/fef9c3/854d0e?text=Cannula', price: 199 },
    { handle: 'simple-face-mask', title: 'Simple Face Mask', image: 'https://placehold.co/400x400/dbeafe/1d4ed8?text=Face+Mask', price: 299 },
    { handle: 'standard-walker', title: 'Standard Walker', image: 'https://placehold.co/400x400/f0fdf4/166534?text=Walker', price: 4999 },
  ],
  faq: [
    { question: 'Who qualifies for the OCC program?', answer: 'Licensed healthcare facilities including hospitals, clinics, urgent care centers, pharmacies, and home health agencies are eligible to apply for OCC membership.' },
    { question: 'How does OCC pricing work?', answer: 'OCC pricing is tiered based on annual spend. Your dedicated account manager will work with you to establish pricing tiers that reflect your order volume.' },
    { question: 'Does the OCC program include free shipping?', answer: 'Free shipping is available on eligible product categories for OCC members who meet minimum order thresholds. Your account manager will confirm which categories and thresholds apply to your account.' },
    { question: 'How do I apply for OCC membership?', answer: 'Contact our B2B team via the contact form or call our dedicated B2B line. We will verify your facility credentials and set up your account within 1–2 business days.' },
  ],
  seoTitle: 'OCC Solutions — MDSupplies',
  seoDescription: 'The MDSupplies OCC program offers healthcare organizations streamlined ordering, volume pricing, and dedicated account support for medical supplies.',
}
