import type { FAQItem } from './seoTypes'

// FAQ data for L1 category pages, keyed by canonical URL slug.
export const CATEGORY_FAQS: Record<string, FAQItem[]> = {
  'wound-care': [
    {
      question: 'What wound care supplies does MDSupplies carry?',
      answer:
        'We stock gauze sponges, wound dressings, bandages, wound closure strips, irrigation supplies, and related consumables from manufacturers including Dukal, Dynarex, and AD Surgical.',
    },
    {
      question: 'Can I order wound care supplies in bulk?',
      answer:
        'Yes. MDSupplies supports bulk and case-quantity ordering for healthcare facilities. Contact our B2B team to discuss volume pricing for your wound care supply needs.',
    },
    {
      question: 'What wound care supplies are most commonly used in urgent care settings?',
      answer:
        'Urgent care centers typically stock gauze sponges, non-adherent dressings, wound closure strips, sutures, and irrigation supplies for laceration and wound management.',
    },
    {
      question: 'Are wound care dressings available in different sizes and types?',
      answer:
        'Yes. We carry wound dressings in multiple sizes and types including foam dressings, non-adherent pads, transparent film, and gauze-based options.',
    },
    {
      question: 'Do you carry wound irrigation supplies?',
      answer:
        'Yes. We stock saline irrigation solutions, irrigation syringes, and wound wash supplies used in clinical and emergency wound care settings.',
    },
  ],

  'gloves': [
    {
      question: 'What types of medical gloves does MDSupplies carry?',
      answer:
        'We carry nitrile, latex, and vinyl exam gloves in a range of sizes and thicknesses, plus sterile surgical gloves from manufacturers including Dynarex and Dukal.',
    },
    {
      question: 'Can I order exam gloves in case quantities?',
      answer:
        'Yes. Exam gloves are available in case quantities for healthcare facilities. Contact our B2B team for volume pricing on box or case orders.',
    },
    {
      question: 'Are nitrile gloves available in different sizes?',
      answer:
        'Yes. Nitrile exam gloves are available in XS through XL sizes. Browse the gloves category for available sizes and glove weights.',
    },
    {
      question: 'Do you carry powder-free exam gloves?',
      answer:
        'The majority of exam gloves in our catalog are powder-free. Browse the gloves category and filter by your preference to see available options.',
    },
    {
      question: 'Are your gloves suitable for clinical use?',
      answer:
        'Our exam gloves are sourced from established medical supply manufacturers and are intended for clinical examination and procedure use by healthcare professionals.',
    },
  ],

  'surgical-sutures': [
    {
      question: 'What types of sutures does MDSupplies carry?',
      answer:
        'We carry absorbable and non-absorbable sutures in monofilament and braided configurations — including polyglactin 910, poliglecaprone, nylon, polypropylene, and chromic gut in all clinical sizes.',
    },
    {
      question: 'Can I order surgical sutures in bulk?',
      answer:
        'Yes. MDSupplies supports bulk ordering for sutures. Contact our B2B team to discuss volume pricing for urgent care centers, private practice, or surgical facilities.',
    },
    {
      question: 'What is the difference between absorbable and non-absorbable sutures?',
      answer:
        'Absorbable sutures break down naturally in the body and do not require removal. Non-absorbable sutures maintain their integrity indefinitely and must be removed by a clinician after healing.',
    },
    {
      question: 'What suture sizes are available?',
      answer:
        'We carry sutures ranging from large-gauge (0–1) for fascial repair down to fine (5-0 and 6-0) for facial or delicate tissue closures. Browse the category for available sizes.',
    },
    {
      question: 'Do you carry sutures from AD Surgical?',
      answer:
        'Yes. AD Surgical sutures and wound closure products are available through MDSupplies at wholesale pricing for qualified healthcare facilities.',
    },
  ],

  'mobility': [
    {
      question: 'What mobility aids does MDSupplies carry?',
      answer:
        'We carry wheelchairs, transport chairs, rollators, standard walkers, and crutches from brands including Drive Medical and Graham Field in standard and bariatric configurations.',
    },
    {
      question: 'Are Drive Medical products available through MDSupplies?',
      answer:
        'Yes. Drive Medical durable medical equipment — including wheelchairs, walkers, and patient aids — is available through MDSupplies at wholesale pricing.',
    },
    {
      question: 'Can home health agencies order mobility supplies in bulk?',
      answer:
        'Yes. We support agency-level purchasing for mobility aids and durable medical equipment. Contact our B2B team to discuss volume pricing for your agency.',
    },
    {
      question: 'Are walkers and rollators available for different patient needs?',
      answer:
        'We carry standard two-wheel and four-wheel walkers, rollators with and without seats, and folding transport chairs. Browse the mobility category for available models.',
    },
    {
      question: 'Do you carry bariatric wheelchairs?',
      answer:
        'Yes. We stock bariatric-capacity wheelchairs and transport chairs for patients requiring wider or reinforced seating. Contact our team for specific sizing availability.',
    },
  ],

  'needles-syringes': [
    {
      question: 'What needle and syringe types does MDSupplies carry?',
      answer:
        'We carry hypodermic needles in gauges from 18 to 30 and lengths from 3/8 in to 2 in, plus syringes from 1 mL to 60 mL for injection, aspiration, and IV use.',
    },
    {
      question: 'Can I order needles and syringes in bulk?',
      answer:
        'Yes. Needles and syringes are available in box and case quantities for healthcare facilities. Contact our B2B team for volume pricing.',
    },
    {
      question: 'What needle gauge is used for intramuscular injections?',
      answer:
        'Intramuscular injections typically use 22–25 gauge needles with a 1 to 1.5-inch length, depending on patient anatomy and the muscle being targeted.',
    },
    {
      question: 'Do you carry insulin syringes?',
      answer:
        'Yes. We carry insulin syringes in 0.3 mL, 0.5 mL, and 1 mL volumes with fine-gauge needles (28–31 gauge) for subcutaneous insulin delivery.',
    },
    {
      question: 'Are safety-engineered needles available?',
      answer:
        'Yes. We carry safety-engineered syringes with retractable or shielded needles to reduce sharps injury risk in clinical settings. Browse the needles and syringes category for available options.',
    },
  ],

  'pharmacy-products': [
    {
      question: 'What pharmacy products does MDSupplies carry?',
      answer:
        'We carry pharmacy labels, prescription vials, oral syringes, amber bottles, counting trays, and related dispensing supplies for retail and compounding pharmacies.',
    },
    {
      question: 'Can I order pharmacy supplies in bulk?',
      answer:
        'Yes. Pharmacy supplies are available in case quantities for retail and compounding pharmacies. Contact our B2B team to discuss volume pricing.',
    },
    {
      question: 'Do you carry prescription vials and amber bottles?',
      answer:
        'Yes. We stock prescription vials, amber plastic bottles, and matching caps in standard pharmacy sizes. Browse the pharmacy products category for available sizes.',
    },
    {
      question: 'Are oral syringes available for liquid medication dispensing?',
      answer:
        'Yes. We carry oral syringes in multiple volumes for dispensing liquid medications to pediatric and adult patients.',
    },
    {
      question: 'Do you carry counting trays and pharmacy accessories?',
      answer:
        'Yes. We carry counting trays, spatulas, and related dispensing accessories used in retail pharmacy daily workflow.',
    },
  ],

  'face-masks': [
    {
      question: 'What types of medical face masks does MDSupplies carry?',
      answer:
        'We carry surgical face masks, disposable procedural face masks, and KN95 masks for healthcare facilities, clinics, and urgent care centers sourced from trusted medical supply manufacturers.',
    },
    {
      question: 'Can I order medical face masks in bulk?',
      answer:
        'Yes. Medical face masks are available in case quantities for healthcare facilities. Contact our B2B team to discuss volume pricing on bulk mask orders.',
    },
    {
      question: 'What is the difference between surgical face masks and KN95 masks?',
      answer:
        'Surgical face masks provide barrier protection against splashes and large respiratory droplets. KN95 masks meet the Chinese GB2626 standard and filter at least 95% of airborne particles, offering closer-fitting respiratory protection.',
    },
    {
      question: 'Are medical face masks suitable for clinical and urgent care settings?',
      answer:
        'Yes. Our medical face masks are sourced from established medical supply manufacturers and intended for clinical use by healthcare professionals, support staff, and patient-facing roles.',
    },
    {
      question: 'Are the face masks FDA-cleared or NIOSH-approved?',
      answer:
        'Certification status varies by product. Check individual product listings for FDA clearance or NIOSH approval information. Our team can assist if you need a specific certified product type.',
    },
  ],
}

// FAQ data for L2 subcategory pages, keyed by the combined Shopify handle (parentSlug-subSlug).
export const SUBCATEGORY_FAQS: Record<string, FAQItem[]> = {
  'surgical-sutures-absorbable-sutures': [
    {
      question: 'What materials are available in absorbable sutures?',
      answer:
        'MDSupplies carries absorbable sutures including polyglactin 910 (braided), poliglecaprone (monofilament), and chromic gut in all standard clinical sizes.',
    },
    {
      question: 'How long do absorbable sutures take to break down?',
      answer:
        'Absorption timelines vary by material: chromic gut absorbs in 21–28 days, polyglactin 910 in 56–70 days, and poliglecaprone in 91–119 days. Select based on expected wound healing time.',
    },
    {
      question: 'When should absorbable sutures be used instead of non-absorbable?',
      answer:
        'Absorbable sutures are preferred for internal tissue layers, subcutaneous closures, mucosal tissue, and situations where suture removal would be impractical or distressing to the patient.',
    },
    {
      question: 'Are absorbable sutures available in both monofilament and braided options?',
      answer:
        'Yes. We carry monofilament absorbable sutures (such as poliglecaprone) and braided absorbable sutures (such as polyglactin 910). Monofilament options have less tissue drag and lower bacterial wicking in contaminated wounds.',
    },
    {
      question: 'Can I order absorbable sutures in bulk for a surgical practice?',
      answer:
        'Yes. MDSupplies supports bulk ordering for sutures. Contact our B2B team for volume pricing on absorbable suture orders for urgent care centers, private practice, or surgical facilities.',
    },
  ],

  'pharmacy-products-pharmacy-labels': [
    {
      question: 'What types of pharmacy labels does MDSupplies carry?',
      answer:
        'We carry prescription bottle labels, vial labels, auxiliary warning labels, and dispensing stickers for retail pharmacies and compounding pharmacies.',
    },
    {
      question: 'Are pharmacy labels available in different sizes?',
      answer:
        'Yes. Pharmacy labels are available in sizes compatible with standard prescription vials and bottles. Browse the pharmacy labels category to see available sizes.',
    },
    {
      question: 'Do you carry auxiliary warning labels for prescription bottles?',
      answer:
        'Yes. We stock auxiliary and warning labels used alongside prescription labels to communicate dosing instructions, storage requirements, and patient precautions.',
    },
    {
      question: 'Can I order pharmacy labels in bulk?',
      answer:
        'Yes. Pharmacy labels are available in case quantities suitable for retail pharmacy purchasing. Contact our B2B team to discuss volume pricing.',
    },
    {
      question: 'Are pharmacy labels compatible with standard labeling systems?',
      answer:
        'Browse individual product listings for compatibility details. Contact our team if you need help sourcing labels compatible with your pharmacy management system.',
    },
  ],
}
