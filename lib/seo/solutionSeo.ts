import type { FAQItem } from './seoTypes'

export interface SolutionSeoData {
  title: string
  metaDescription: string
  answerBlock: string
  faqs: FAQItem[]
}

// Keyed by solution route slug.
const SOLUTION_SEO_DB: Record<string, SolutionSeoData> = {
  'occ': {
    title: 'Charity & Nonprofit Medical Supply Program | MDSupplies OCC',
    metaDescription:
      'MDSupplies OCC program supports nonprofits, free clinics, food banks, and community organizations with preferred pricing on bulk medical supplies, hygiene kits, and care products.',
    answerBlock:
      'The MDSupplies OCC program offers qualifying nonprofits, free clinics, food banks, and faith-based health ministries preferred pricing on bulk medical supplies, hygiene kits, and care products with dedicated account management.',
    faqs: [
      {
        question: 'What is the MDSupplies OCC program?',
        answer:
          'OCC stands for Organized Customer Care. The MDSupplies OCC program provides nonprofits, free clinics, food banks, and community health organizations with preferred pricing on bulk medical supplies, hygiene kits, and care products — along with dedicated account management and streamlined ordering.',
      },
      {
        question: 'What types of organizations qualify for the OCC program?',
        answer:
          'The OCC program is open to registered nonprofits, food banks, free clinics, disaster relief organizations, faith-based health ministries, school health programs, and community health drives. Contact our team to confirm eligibility.',
      },
      {
        question: 'What bulk donation supplies and hygiene kits are available?',
        answer:
          'OCC-eligible products include exam gloves, wound care supplies, hygiene kits, personal care items, disposable bed pads, and other consumables used in shelter programs, community health drives, and donation-based care initiatives.',
      },
      {
        question: 'How does OCC pricing work for nonprofits?',
        answer:
          'OCC pricing is tiered based on organization type and order volume. Nonprofits receive reduced per-unit pricing on bulk orders. Your dedicated account manager will establish pricing that reflects your program\'s purchasing patterns.',
      },
      {
        question: 'How do I apply for the OCC program?',
        answer:
          'Contact the MDSupplies B2B team through the contact form on this page. We will verify your organization\'s credentials and set up your account within 1–2 business days.',
      },
    ],
  },
}

export function getSolutionSeo(slug: string): SolutionSeoData | undefined {
  return SOLUTION_SEO_DB[slug]
}
