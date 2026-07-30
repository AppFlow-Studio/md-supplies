import type { FAQItem } from './seoTypes'

export interface BlogSeoData {
  title: string
  metaDescription: string
  faqs?: FAQItem[]
}

// Keyed by article handle.
const BLOG_SEO_DB: Record<string, BlogSeoData> = {
  'types-of-sutures': {
    title: 'Types of Sutures: Absorbable vs Non-Absorbable | MDSupplies Blog',
    metaDescription:
      'A clinical guide to suture materials — absorbable vs non-absorbable, monofilament vs braided, suture size selection, and wound closure guidance for healthcare professionals.',
    faqs: [
      {
        question: 'What is the difference between absorbable and non-absorbable sutures?',
        answer:
          'Absorbable sutures break down naturally in the body over time and do not require removal. Non-absorbable sutures maintain their strength indefinitely and must be removed by a clinician once the wound has healed.',
      },
      {
        question: 'When should you use monofilament instead of braided sutures?',
        answer:
          'Monofilament sutures are preferred when reducing bacterial wicking is important — such as in contaminated or infection-prone wounds. Braided sutures offer superior knot security and handling for clean tissue closures.',
      },
      {
        question: 'What suture size should be used for facial lacerations?',
        answer:
          'Facial lacerations typically require 5-0 or 6-0 sutures for delicate tissue and minimal scarring. A fine monofilament non-absorbable suture such as nylon is commonly used for facial skin closures.',
      },
      {
        question: 'How long do absorbable sutures take to dissolve?',
        answer:
          'Absorption timelines vary by material: chromic gut absorbs in 21–28 days, polyglactin 910 in 56–70 days, and poliglecaprone in 91–119 days.',
      },
    ],
  },

  'types-of-needles': {
    title: 'Types of Needles Used in Medical Settings | MDSupplies Blog',
    metaDescription:
      'A practical guide to needle gauge, bevel types, needle lengths, and clinical use cases — from intramuscular injections and blood draws to IV access.',
    faqs: [
      {
        question: 'What needle gauge is used for intramuscular injections?',
        answer:
          'Intramuscular injections typically use 22–25 gauge needles with a 1 to 1.5-inch length, adjusted for patient body composition and the injection site.',
      },
      {
        question: 'What does needle gauge mean?',
        answer:
          'Needle gauge refers to the outer diameter of the needle. Higher gauge numbers indicate thinner needles — for example, a 30-gauge needle is finer than an 18-gauge needle.',
      },
      {
        question: 'What needle is used for insulin injections?',
        answer:
          'Insulin is typically administered with 28–31 gauge needles in lengths of 4 mm to 12.7 mm (approximately 3/16 to 1/2 inch) for subcutaneous delivery.',
      },
    ],
  },
}

export function getBlogSeo(handle: string): BlogSeoData | undefined {
  return BLOG_SEO_DB[handle]
}
