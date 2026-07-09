import { getIndustryImagePath } from '@/lib/bunnycdn'
import type { FAQ } from '@/types/industry'

export type { FAQ }

export type Industry = {
  name: string
  slug: string
  collectionHandle: string
  description: string
  image: string
  buyerType: string
  faq?: FAQ[]
}

export const INDUSTRIES: Industry[] = [
  {
    name: 'Urgent Care',
    slug: 'urgent-care',
    collectionHandle: 'urgent-care',
    description: 'Exam gloves, wound care, diagnostics, and testing supplies.',
    image: getIndustryImagePath('industry-urgent-care.jpeg'),
    buyerType: 'Urgent care center owners, clinic managers, and medical directors sourcing high-turnover consumables for walk-in patient care.',
    faq: [
      {
        question: 'What are the most commonly ordered supplies for urgent care centers?',
        answer: 'Urgent care centers typically order high volumes of exam gloves, wound care dressings, rapid diagnostic test kits, IV supplies, and disposable exam room consumables. MDSupplies carries all of these categories with bulk ordering options.',
      },
      {
        question: 'Can urgent care centers order in bulk to reduce per-unit cost?',
        answer: 'Yes. MDSupplies offers volume-based pricing for facilities that order regularly. Contact our B2B team to discuss account setup and volume pricing tiers for your center.',
      },
      {
        question: 'Do you carry point-of-care testing and rapid diagnostic supplies?',
        answer: 'We carry testing supplies including rapid test kits, urine dipsticks, and specimen collection materials. Browse our diagnostics and testing category to see current availability.',
      },
      {
        question: 'How do I set up a recurring supply order for my urgent care center?',
        answer: 'Contact our B2B team to discuss account management options. We can help you establish preferred ordering quantities and streamline reordering so your facility stays stocked without manual intervention each cycle.',
      },
      {
        question: 'Are wound care and laceration supplies available for urgent care use?',
        answer: 'Yes. We carry sutures, wound closure strips, irrigation supplies, and dressing materials appropriate for urgent care laceration management. Browse the wound care category for available options.',
      },
    ],
  },
  {
    name: 'HRT Clinics',
    slug: 'hrt-clinics',
    collectionHandle: 'hrt-clinics',
    description: 'Trocar kits, syringes, needles, and specialized hormone supplies.',
    image: getIndustryImagePath('industry-HRT-clinics-surgery-&-procedure.jpeg'),
    buyerType: 'Hormone replacement therapy clinic operators and nurse practitioners managing ongoing pellet insertion and injection protocols.',
    faq: [
      {
        question: 'Do you carry trocar kits and pellet insertion supplies for HRT clinics?',
        answer: 'Yes. We carry trocar kits, needles, syringes, and related supplies used in hormone pellet insertion procedures. Browse the HRT Clinics category to see available options.',
      },
      {
        question: 'What needle and syringe options are available for hormone injection protocols?',
        answer: 'We carry a range of needle gauges and lengths suitable for intramuscular and subcutaneous hormone injections, as well as sterile syringes in the volumes commonly used for HRT protocols. Browse needles and syringes for available sizes.',
      },
      {
        question: 'Can I order procedure supplies in the quantities needed for a high-volume HRT practice?',
        answer: 'Yes. We offer bulk and case-quantity ordering for clinics that perform procedures regularly. Contact our B2B team to discuss volume pricing options for your practice.',
      },
      {
        question: 'Are your supplies appropriate for in-office procedure rooms?',
        answer: 'Our products are sourced from established medical supply manufacturers and are intended for use in licensed clinical settings. Review each product listing for manufacturer specifications and intended use.',
      },
      {
        question: 'How do I find supplies specific to my procedure type?',
        answer: 'Browse the HRT Clinics category on MDSupplies or use the search bar to look up specific product types such as trocars, pellet insertion kits, or injection needles. Contact our team if you need help sourcing a specific item.',
      },
    ],
  },
  {
    name: 'EMS & First Responders',
    slug: 'ems',
    collectionHandle: 'ems',
    description: 'First responder bags, trauma supplies, and emergency kits.',
    image: getIndustryImagePath('industry-ems-first-responders.jpeg'),
    buyerType: 'EMT coordinators, paramedic supervisors, and fire department supply officers restocking trauma and emergency response bags.',
  },
  {
    name: 'Home Health',
    slug: 'home-health',
    collectionHandle: 'home-health',
    description: 'Incontinence, wound care, and daily living aids.',
    image: getIndustryImagePath('industry-home-care.jpeg'),
    buyerType: 'Home health agency owners, visiting nurse supervisors, and care coordinators ordering supplies for patient homes and caregiver kits.',
    faq: [
      {
        question: 'What supplies do home health agencies typically need to order?',
        answer: 'Home health agencies commonly order wound care dressings, incontinence products, gloves, personal care items, and mobility aids. MDSupplies carries all of these in quantities suitable for agency-level purchasing.',
      },
      {
        question: 'Can I order supplies on behalf of multiple patients from one account?',
        answer: 'Yes. Our B2B account structure supports agency-level purchasing where one account manager can place and track orders across multiple patient assignments. Contact our team to set up your account.',
      },
      {
        question: 'Do you offer bulk pricing for home health agencies?',
        answer: 'We offer volume-based pricing for agencies that order regularly. Reach out to our B2B team to discuss pricing tiers based on your anticipated order volume.',
      },
      {
        question: 'Are incontinence and personal care products available in case quantities?',
        answer: 'Yes. Incontinence briefs, underpads, and personal care wipes are available in case quantities appropriate for agency purchasing. Browse the incontinence and personal care categories for current options.',
      },
      {
        question: 'What is the best way to manage supply orders for a distributed care team?',
        answer: 'Contact our B2B team to discuss account management options. We can help you organize ordering by care team or territory so your coordinators can track and replenish supplies efficiently.',
      },
    ],
  },
  {
    name: 'Long-Term Care',
    slug: 'long-term-care',
    collectionHandle: 'long-term-care',
    description: 'Bulk supplies for nursing homes and assisted living facilities.',
    image: getIndustryImagePath('industry-long-term-care.jpeg'),
    buyerType: 'Nursing home directors of nursing, assisted living administrators, and procurement managers ordering bulk disposables and resident-care supplies.',
  },
  {
    name: 'Physical Therapy',
    slug: 'physical-therapy',
    collectionHandle: 'physical-therapy',
    description: 'Mobility equipment and therapy rehabilitation aids.',
    image: getIndustryImagePath('industry-physical-therapy-supplies.jpeg'),
    buyerType: 'Physical therapists and practice owners sourcing mobility aids, exercise equipment, and patient rehabilitation supplies.',
  },
  {
    name: 'Private Practice',
    slug: 'private-practice',
    collectionHandle: 'private-practice',
    description: 'Exam room essentials, diagnostics, and office supplies.',
    image: getIndustryImagePath('industry-private-practice-supplies.jpeg'),
    buyerType: 'Independent physicians, specialty clinicians, and office managers equipping exam rooms and maintaining day-to-day clinical supplies.',
  },
  {
    name: 'Dental',
    slug: 'dental',
    collectionHandle: 'dental',
    description: 'Gloves, sterilization, barriers, and instruments.',
    image: getIndustryImagePath('industry-dental.jpeg'),
    buyerType: 'Dental office managers and dentists purchasing infection control supplies, gloves, and instrument accessories for operatory use.',
  },
  {
    name: 'Veterinary',
    slug: 'veterinary',
    collectionHandle: 'veterinary',
    description: 'Syringes, gloves, and veterinary wound care.',
    image: getIndustryImagePath('industry-veterinary.jpeg'),
    buyerType: 'Veterinarians, vet techs, and clinic office managers sourcing exam gloves, syringes, and wound care for small and large animal practice.',
  },
  {
    name: 'Community Health',
    slug: 'community-health',
    collectionHandle: 'community-health',
    description: 'Affordable supplies for nonprofits and free clinics.',
    image: getIndustryImagePath('industry-community-health-supplies.jpeg'),
    buyerType: 'Nonprofit health center directors, free clinic managers, and grant-funded program coordinators sourcing cost-effective supplies for underserved communities.',
  },
  {
    name: 'Clinics & Doctor\'s Offices',
    slug: 'clinics-doctors-offices',
    collectionHandle: 'clinics-doctors-offices',
    description: 'Exam room essentials, diagnostic supplies, gloves, and office consumables for outpatient practices.',
    image: getIndustryImagePath("industry-clinics-&-doctor's-offices.jpeg"),
    buyerType: 'Clinic owners, office managers, and medical directors sourcing exam room consumables, diagnostic supplies, and day-to-day clinical materials for outpatient practices.',
    faq: [
      {
        question: 'What types of medical supplies do clinics and doctor\'s offices typically order?',
        answer: 'Clinics and physician offices typically order exam gloves, exam table paper, diagnostic supplies, wound care materials, specimen collection items, and general consumables. MDSupplies carries all of these categories with ordering options suited to practice-level volumes.',
      },
      {
        question: 'Can I set up a standing order or recurring supply arrangement for my practice?',
        answer: 'Yes. Contact our B2B team to discuss account setup and recurring order options. We can help you establish consistent order cycles so your exam rooms stay stocked without manual reordering each time.',
      },
      {
        question: 'Do you offer volume pricing for clinics that order regularly?',
        answer: 'We offer volume-based pricing for practices that maintain consistent ordering. Contact our B2B team to discuss pricing tiers appropriate for your practice\'s order volume.',
      },
      {
        question: 'How do I find supplies specific to my specialty?',
        answer: 'Browse by category on MDSupplies — we carry supplies relevant to primary care, dermatology, OB/GYN, pediatrics, and other outpatient specialties. Use the search bar to look up specific items or contact our team for sourcing assistance.',
      },
      {
        question: 'Are your products suitable for pediatric practices?',
        answer: 'We carry pediatric-appropriate sizes in gloves, exam supplies, and related consumables. Browse the relevant categories or contact our team if you need help identifying pediatric-appropriate products for your practice.',
      },
    ],
  },
  {
    name: 'Pharmacies',
    slug: 'pharmacies',
    collectionHandle: 'pharmacies',
    description: 'Diabetic care, home monitoring, incontinence, and OTC medical supplies for pharmacy retail and patient support.',
    image: getIndustryImagePath('industry-pharmacies.jpeg'),
    buyerType: 'Pharmacy owners, buyers, and retail managers sourcing front-end medical supply inventory, diabetic care products, home monitoring devices, and patient-facing consumables.',
    faq: [
      {
        question: 'What medical supplies can pharmacies stock and sell to patients?',
        answer: 'Pharmacies commonly stock diabetic care supplies, blood glucose monitors, lancets, incontinence products, wound care items, compression stockings, and mobility aids. MDSupplies carries these categories with wholesale ordering options suitable for pharmacy purchasing.',
      },
      {
        question: 'Do you offer wholesale pricing for pharmacy buyers?',
        answer: 'Yes. We offer volume-based pricing for pharmacy accounts that order regularly. Contact our B2B team to set up a pharmacy account and discuss pricing tiers.',
      },
      {
        question: 'Can I source diabetic care supplies and home monitoring equipment through MDSupplies?',
        answer: 'We carry lancets, glucose test strips, and related diabetic care consumables, as well as home monitoring supplies. Browse the relevant categories or contact our team to discuss sourcing for your pharmacy\'s front-end needs.',
      },
      {
        question: 'Are there products suitable for pharmacy resale to patients?',
        answer: 'Yes. Many of the products we carry are appropriate for pharmacy retail, including wound care, incontinence, personal care, and home health items. Review individual product listings for intended use and packaging details.',
      },
      {
        question: 'How do I manage recurring supply orders for my pharmacy?',
        answer: 'Contact our B2B team to discuss account management and recurring order options. We can help you establish a consistent ordering cycle aligned with your pharmacy\'s inventory replenishment schedule.',
      },
    ],
  },
]

/**
 * An industry page is "complete" (and therefore indexable) once it carries
 * unique positioning plus client-approved FAQ copy. Pages still awaiting FAQ
 * content are thin and should render `noindex,follow` until complete (E8 §9.2).
 */
export function isIndustryComplete(industry: Industry): boolean {
  return Boolean(
    industry.buyerType?.trim() && industry.description?.trim() && industry.faq?.length,
  )
}
