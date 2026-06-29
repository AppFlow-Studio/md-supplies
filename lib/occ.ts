import type { OCCHub } from '@/types/occ'

export const OCC_HUB: OCCHub = {
  title: 'OCC Solutions',
  intro: 'MDSupplies supports charitable organizations, nonprofits, and community programs with streamlined medical supply ordering, preferred pricing, and dedicated account support — whether you run a food pantry, a free clinic, a faith-based health ministry, or a community health drive.',
  programExplanation: 'Our Organized Customer Care (OCC) program is open to qualifying nonprofits and charitable organizations that need reliable access to medical and care supplies. Eligible organizations receive dedicated account management, priority fulfillment, and access to volume-based pricing tiers. We work with food banks, disaster relief teams, free clinics, faith-based ministries, school health programs, and other community-serving organizations.',
  freeShippingMessage: 'Qualifying OCC members may be eligible for free standard shipping on select product categories. Your account manager will confirm eligibility and applicable thresholds.',
  eligibleCategories: [
    { handle: 'exam-gloves', title: 'Exam Gloves' },
    { handle: 'wound-care', title: 'Wound Care' },
    { handle: 'personal-care', title: 'Personal Care' },
    { handle: 'disposables', title: 'Disposables' },
  ],
  eligibleProducts: [
    { handle: 'nitrile-exam-gloves-powder-free', title: 'Nitrile Exam Gloves', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Nitrile+Gloves', price: 2499 },
    { handle: 'latex-exam-gloves-powder-free',   title: 'Latex Exam Gloves',  image: 'https://placehold.co/400x400/fef9c3/854d0e?text=Latex+Gloves',  price: 2299 },
    { handle: 'disposable-bed-pads',             title: 'Disposable Bed Pads', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Bed+Pads',      price: 3299 },
    { handle: 'nasal-cannula-adult',             title: 'Nasal Cannula, Adult', image: 'https://placehold.co/400x400/fef9c3/854d0e?text=Cannula',      price: 199  },
    { handle: 'simple-face-mask',                title: 'Simple Face Mask',   image: 'https://placehold.co/400x400/dbeafe/1d4ed8?text=Face+Mask',      price: 299  },
    { handle: 'standard-walker',                 title: 'Standard Walker',    image: 'https://placehold.co/400x400/f0fdf4/166534?text=Walker',          price: 4999 },
  ],
  faq: [
    {
      question: 'What types of organizations qualify for the OCC program?',
      answer: 'The OCC program is open to registered nonprofits, charitable organizations, free clinics, food banks, disaster relief organizations, faith-based health ministries, school health programs, and community health drives. Contact our team to confirm eligibility for your organization.',
    },
    {
      question: 'We run a food bank and community health drive — can we participate?',
      answer: 'Yes. We work with food banks, community pantries, and health drive organizers that need to source gloves, wound care items, personal care products, and other consumables. Contact our B2B team to discuss your program\'s needs.',
    },
    {
      question: 'How does OCC pricing work for nonprofits?',
      answer: 'OCC pricing is tiered based on organization type and order volume. Your dedicated account manager will work with you to establish pricing that reflects your program\'s purchasing patterns. Nonprofit status may be taken into account during account setup.',
    },
    {
      question: 'Does the OCC program include free shipping?',
      answer: 'Free standard shipping may be available on eligible product categories for qualifying OCC members. Your account manager will confirm which categories and order thresholds apply to your account.',
    },
    {
      question: 'How do I apply for OCC membership?',
      answer: 'Contact our B2B team via the contact form on this page. We will verify your organization\'s credentials and set up your account within 1–2 business days.',
    },
    {
      question: 'Can faith-based organizations and church health ministries apply?',
      answer: 'Yes. Faith-based health ministries and church-affiliated community programs that provide care supplies to underserved populations are welcome to apply for OCC membership.',
    },
  ],
  seoTitle: 'OCC Solutions — MDSupplies',
  seoDescription: 'MDSupplies supports nonprofits, free clinics, food banks, faith-based ministries, and community organizations with streamlined medical supply ordering and preferred pricing through our OCC program.',
}
