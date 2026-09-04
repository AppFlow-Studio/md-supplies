import type { PageSEO } from './seoTypes'
import { CATEGORY_FAQS, SUBCATEGORY_FAQS } from './faqSeo'

// Keyed by canonical URL slug (e.g. 'wound-care', 'gloves').
const CATEGORY_SEO_DB: Record<string, PageSEO> = {
  'wound-care': {
    route: '/category/wound-care',
    pageType: 'category',
    primaryKeyword: 'wound care supplies',
    secondaryKeywords: ['wound dressings', 'gauze sponges', 'bandages', 'wound irrigation', 'wound closure'],
    searchIntent: 'transactional — healthcare buyer sourcing consumable wound care stock',
    targetAudience: 'Urgent care center managers, clinic procurement staff, home health agency buyers',
    title: 'Wound Care Supplies for Healthcare | MDSupplies',
    metaDescription:
      'Shop wound care supplies at wholesale prices — gauze, dressings, bandages, and irrigation kits for clinics, urgent care, and home health agencies.',
    h1: 'Wound Care Supplies',
    answerBlock:
      'MDSupplies stocks professional wound care supplies — gauze sponges, wound dressings, bandages, and irrigation solutions — at wholesale prices for clinics, urgent care centers, and home health agencies.',
    contentSections: [],
    faqs: CATEGORY_FAQS['wound-care'] ?? [],
    internalLinks: [
      '/category/surgical-sutures',
      '/category/gloves',
      '/industries/urgent-care',
      '/industries/home-health',
      '/partners/dukal',
      '/partners/dynarex',
    ],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] wound care [product type] for clinical use',
    croNotes: 'Emphasize bulk pricing badge; link to OCC program for high-volume buyers',
    priority: 'P0',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-06-29',
  },

  'gloves': {
    route: '/category/gloves',
    pageType: 'category',
    primaryKeyword: 'exam gloves',
    secondaryKeywords: ['nitrile gloves', 'latex gloves', 'vinyl gloves', 'medical gloves', 'examination gloves'],
    searchIntent: 'transactional — high-volume consumable reorder for clinical settings',
    targetAudience: 'Dental office managers, urgent care buyers, veterinary clinics, general healthcare facilities',
    title: 'Exam Gloves | Nitrile, Latex & Vinyl | MDSupplies',
    metaDescription:
      'Shop gloves at wholesale prices — nitrile, latex, and vinyl, exam and surgical, powder-free options in all sizes. Bulk case pricing for facilities.',
    // H1 was 'Exam Gloves', which is a SUBSET of this page, not the page.
    // Measured live 2026-08-12: /category/gloves carries 445 products and its
    // Category facet's top value is literally "Exam Gloves — 307" — so the
    // heading named one facet value while the grid showed nine more (Surgical
    // 74, General Purpose 25, Cleanroom 11, Finger Cots, Industrial, Glove
    // Dispensers, Specialty, Utility). A shopper landing on "Exam Gloves" and
    // seeing surgical gloves has been mis-titled, and the heading disagreed
    // with the breadcrumb, the nav label and the tile that linked here.
    // 'Medical Gloves' is accurate for the whole set, matches the approved
    // display name, and keeps the keyword. The TITLE tag still leads with
    // "Exam Gloves" — that is metadata targeting the dominant query, which is
    // fine; the visible H1 has to describe what is actually on the page.
    h1: 'Medical Gloves',
    answerBlock:
      'MDSupplies carries nitrile, latex, and vinyl gloves — exam, surgical, and general-purpose — in all sizes from Dynarex, Dukal, and other trusted manufacturers at wholesale prices for clinics, dental offices, and healthcare facilities.',
    contentSections: [],
    faqs: CATEGORY_FAQS['gloves'] ?? [],
    internalLinks: [
      '/category/wound-care',
      '/category/exam-room',
      '/industries/dental',
      '/industries/urgent-care',
      '/partners/dynarex',
      '/partners/dukal',
    ],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] [type] exam gloves [size]',
    croNotes: 'Surface case-quantity pricing prominently; OCC eligible',
    priority: 'P0',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-06-29',
  },

  'surgical-sutures': {
    route: '/category/surgical-sutures',
    pageType: 'category',
    primaryKeyword: 'surgical sutures',
    secondaryKeywords: ['absorbable sutures', 'non-absorbable sutures', 'wound closure', 'suture sizes', 'monofilament sutures'],
    searchIntent: 'transactional — clinical buyer sourcing sutures for wound closure procedures',
    targetAudience: 'Urgent care center managers, private practice physicians, surgical facility buyers',
    title: 'Surgical Sutures | All Types & Sizes | MDSupplies',
    metaDescription:
      'Shop surgical sutures at wholesale prices — absorbable, non-absorbable, monofilament, and braided sutures in all clinical sizes. Bulk ordering available.',
    h1: 'Surgical Sutures',
    answerBlock:
      'MDSupplies carries a complete range of surgical sutures — absorbable and non-absorbable, monofilament and braided — in all clinical sizes for urgent care, private practice, and surgical settings.',
    contentSections: [],
    faqs: CATEGORY_FAQS['surgical-sutures'] ?? [],
    internalLinks: [
      '/category/wound-care',
      '/category/surgical-sutures/absorbable-sutures',
      '/industries/urgent-care',
      '/industries/clinics-doctors-offices',
      '/partners/ad-surgical',
    ],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] [material] sutures [size] — [absorbable/non-absorbable]',
    croNotes: 'Highlight AD Surgical brand; link to blog article on suture types',
    priority: 'P0',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-06-29',
  },

  'mobility': {
    route: '/category/mobility',
    pageType: 'category',
    primaryKeyword: 'mobility supplies',
    secondaryKeywords: ['wheelchairs', 'walkers', 'rollators', 'mobility aids', 'durable medical equipment', 'DME'],
    searchIntent: 'transactional — home health agency or facility buyer sourcing DME and mobility aids',
    targetAudience: 'Home health agency buyers, long-term care facility procurement, physical therapy practices',
    title: 'Mobility Supplies & DME | Wholesale | MDSupplies',
    metaDescription:
      'Shop mobility supplies at wholesale prices — wheelchairs, walkers, rollators, canes, and mobility aids for home health, long-term care, and PT practices.',
    h1: 'Mobility Supplies & Equipment',
    answerBlock:
      'MDSupplies stocks wheelchairs, walkers, rollators, and mobility aids from Drive Medical and Graham Field at wholesale prices for home health agencies, long-term care facilities, and physical therapy practices.',
    contentSections: [],
    faqs: CATEGORY_FAQS['mobility'] ?? [],
    internalLinks: [
      '/category/patient-therapy-rehab',
      '/industries/home-health',
      '/industries/long-term-care',
      '/industries/physical-therapy',
      '/partners/drive-medical',
      '/partners/graham-field',
    ],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] [product type] — [model] for home health or clinical use',
    croNotes: 'Surface Drive Medical brand badge; emphasize bariatric sizing availability',
    priority: 'P0',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-06-29',
  },

  'needles-syringes': {
    route: '/category/needles-syringes',
    pageType: 'category',
    primaryKeyword: 'needles and syringes',
    secondaryKeywords: ['hypodermic needles', 'insulin syringes', 'safety needles', 'injection supplies', 'sharps'],
    searchIntent: 'transactional — clinical buyer restocking injection and phlebotomy supplies',
    targetAudience: 'HRT clinic operators, urgent care centers, veterinary clinics, home health agencies',
    title: 'Needles & Syringes | All Gauges & Sizes | MDSupplies',
    metaDescription:
      'Shop needles and syringes at wholesale prices — hypodermic needles in all gauges, insulin syringes, and safety-engineered options. Bulk case pricing.',
    h1: 'Needles & Syringes',
    answerBlock:
      'MDSupplies carries hypodermic needles in gauges from 18 to 30 and syringes from 1 mL to 60 mL at wholesale prices for clinics, HRT practices, urgent care centers, and veterinary use.',
    contentSections: [],
    faqs: CATEGORY_FAQS['needles-syringes'] ?? [],
    internalLinks: [
      '/industries/hrt-clinics',
      '/industries/urgent-care',
      '/industries/veterinary',
      '/category/iv-therapy',
    ],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] [gauge]G [length] needle — [use type]',
    croNotes: 'HRT clinic buyers are high-LTV; surface pellet and trocar supplies in related links',
    priority: 'P1',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-06-29',
  },

  'face-masks': {
    route: '/category/face-masks',
    pageType: 'category',
    primaryKeyword: 'medical face masks',
    secondaryKeywords: ['disposable face masks', 'surgical face masks', 'KN95 masks', 'face masks bulk', 'procedural face masks'],
    searchIntent: 'transactional — healthcare buyer sourcing respiratory protection and procedural masks',
    targetAudience: 'Clinic managers, urgent care centers, dental offices, home health agencies, healthcare facilities',
    title: 'Medical Face Masks | Surgical & Disposable | MDSupplies',
    metaDescription:
      'Shop medical face masks at wholesale prices — surgical, procedure, and N95 masks for clinics, urgent care, and healthcare facilities. Bulk case ordering.',
    h1: 'Medical Face Masks',
    answerBlock:
      'MDSupplies carries surgical face masks, disposable procedural masks, and KN95 face masks at wholesale prices for clinics, urgent care centers, dental offices, and healthcare facilities.',
    contentSections: [],
    faqs: CATEGORY_FAQS['face-masks'] ?? [],
    internalLinks: [
      '/category/gloves',
      '/category/apparel',
      '/category/hygiene',
      '/industries/urgent-care',
      '/solutions/occ',
    ],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] [type] face mask for clinical use',
    croNotes: 'Case-quantity pricing badge recommended; OCC eligible for bulk nonprofit orders',
    priority: 'P1',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-06-29',
  },

  'pharmacy-products': {
    route: '/category/pharmacy-products',
    pageType: 'category',
    primaryKeyword: 'pharmacy supplies',
    secondaryKeywords: ['prescription vials', 'pharmacy labels', 'oral syringes', 'amber bottles', 'counting trays'],
    searchIntent: 'transactional — pharmacy buyer sourcing dispensing supplies and consumables',
    targetAudience: 'Retail pharmacy buyers, compounding pharmacy procurement, pharmacy managers',
    title: 'Pharmacy Supplies & Dispensing Products | MDSupplies',
    metaDescription:
      'Shop pharmacy supplies at wholesale prices — prescription vials, labels, oral syringes, and dispensing accessories for retail and compounding pharmacies.',
    h1: 'Pharmacy Supplies',
    answerBlock:
      'MDSupplies stocks pharmacy dispensing supplies including prescription vials, amber bottles, pharmacy labels, oral syringes, and counting trays at wholesale prices for retail and compounding pharmacies.',
    contentSections: [],
    faqs: CATEGORY_FAQS['pharmacy-products'] ?? [],
    internalLinks: [
      '/category/pharmacy-products/pharmacy-labels',
      '/industries/pharmacies',
      '/category/incontinence',
    ],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Product type] for pharmacy dispensing — [Brand]',
    croNotes: 'Pharmacy buyers are repeat purchasers; surface bulk pricing and B2B account signup',
    priority: 'P1',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-06-29',
  },
}

// Keyed by the combined Shopify handle (e.g. 'surgical-sutures-absorbable-sutures').
const SUBCATEGORY_SEO_DB: Record<string, PageSEO> = {
  'surgical-sutures-absorbable-sutures': {
    route: '/category/surgical-sutures/absorbable-sutures',
    pageType: 'subcategory',
    primaryKeyword: 'absorbable sutures',
    secondaryKeywords: ['polyglactin 910', 'vicryl sutures', 'poliglecaprone', 'chromic gut', 'dissolvable stitches'],
    searchIntent: 'transactional — clinical buyer selecting absorbable suture material and size',
    targetAudience: 'Urgent care physicians, private practice surgeons, OR supply coordinators',
    title: 'Absorbable Sutures | All Materials & Sizes | MDSupplies',
    metaDescription:
      'Shop absorbable sutures at wholesale prices — polyglactin 910, poliglecaprone, and chromic gut in all clinical sizes for urgent care, private practice, and surgical wound closure.',
    h1: 'Absorbable Sutures',
    answerBlock:
      'Absorbable sutures break down naturally in the body, eliminating the need for removal. MDSupplies carries polyglactin 910, poliglecaprone, and chromic gut in all clinical sizes.',
    contentSections: [],
    faqs: SUBCATEGORY_FAQS['surgical-sutures-absorbable-sutures'] ?? [],
    internalLinks: [
      '/category/surgical-sutures',
      '/category/wound-care',
      '/blog/types-of-sutures',
      '/industries/urgent-care',
      '/partners/ad-surgical',
    ],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] [material] absorbable suture [size]',
    croNotes: 'Link to types-of-sutures blog article for buyers researching suture selection',
    priority: 'P0',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-06-29',
  },

  'pharmacy-products-pharmacy-labels': {
    route: '/category/pharmacy-products/pharmacy-labels',
    pageType: 'subcategory',
    primaryKeyword: 'pharmacy labels',
    secondaryKeywords: ['prescription bottle labels', 'vial labels', 'auxiliary labels', 'warning labels', 'pharmacy stickers'],
    searchIntent: 'transactional — pharmacy buyer sourcing labeling supplies',
    targetAudience: 'Retail pharmacy buyers, compounding pharmacy managers, pharmacy purchasing staff',
    title: 'Pharmacy Labels | Prescription & Auxiliary | MDSupplies',
    metaDescription:
      'Shop pharmacy labels at wholesale prices — prescription bottle labels, vial labels, and auxiliary warning labels for retail and compounding pharmacies. Bulk ordering available.',
    h1: 'Pharmacy Labels',
    answerBlock:
      'MDSupplies carries pharmacy labels including prescription bottle labels, vial labels, warning stickers, and auxiliary labels used in retail and compounding pharmacy settings.',
    contentSections: [],
    faqs: SUBCATEGORY_FAQS['pharmacy-products-pharmacy-labels'] ?? [],
    internalLinks: [
      '/category/pharmacy-products',
      '/industries/pharmacies',
    ],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: 'Pharmacy prescription labels — [type] for retail pharmacy dispensing',
    croNotes: 'Pharmacy labels are low-ticket, high-reorder — emphasize bulk pricing and easy reorder',
    priority: 'P1',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-06-29',
  },
}

export function getCategorySeo(slug: string): PageSEO | undefined {
  return CATEGORY_SEO_DB[slug]
}

export function getSubcategorySeo(parentSlug: string, subSlug: string): PageSEO | undefined {
  const subHandle = `${parentSlug}-${subSlug}`
  return SUBCATEGORY_SEO_DB[subHandle]
}
