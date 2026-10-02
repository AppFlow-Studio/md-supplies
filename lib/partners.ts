import type { Partner } from '@/types/partner'

export const PARTNERS: Partner[] = [
  {
    slug: 'ad-surgical',
    name: 'AD Surgical',
    vendorName: 'AD Surgical',
    type: 'brand',
    isActive: true,
    description: 'Leading provider of surgical sutures, wound closure, and procedure kits.',
    logo: {
      url: '/api/bunny/brands/ad-surgical.webp',
      altText: 'AD Surgical logo',
      width: 580,
      height: 158,
    },
    intro: 'AD Surgical is a trusted name in surgical wound management, offering a comprehensive portfolio of sutures, wound closure strips, staples, and procedure kits designed for clinical precision and consistent outcomes.',
    productCategories: ['surgical', 'wound-closure', 'sutures', 'procedure-kits'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'surgical-sutures', title: 'Surgical Supplies' },
      { handle: 'wound-care', title: 'Wound Care' },
    ],
    seoTitle: 'AD Surgical Products | MDSupplies',
    seoDescription: 'Shop AD Surgical sutures, wound closure, and procedure kits through MDSupplies.',
  },
  {
    slug: 'cordx',
    name: 'CorDx',
    vendorName: 'CorDx',
    type: 'brand',
    isActive: true,
    description: 'Advanced rapid diagnostic testing solutions for clinical and point-of-care settings.',
    logo: {
      url: '/api/bunny/brands/cordx.png',
      altText: 'CorDx logo',
      width: 2295,
      height: 654,
    },
    intro: 'CorDx develops rapid diagnostic tests and point-of-care solutions trusted by clinics, urgent care centers, and public health agencies. Their portfolio spans infectious disease testing, flu panels, and molecular assays.',
    productCategories: ['diagnostics', 'rapid-tests', 'point-of-care'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'testing-screening', title: 'Diagnostics & Rapid Tests' },
    ],
    seoTitle: 'CorDx Rapid Diagnostic Products | MDSupplies',
    seoDescription: 'Shop CorDx rapid diagnostic testing solutions through MDSupplies.',
  },
  {
    slug: 'dukal',
    name: 'Dukal',
    vendorName: 'Dukal',
    type: 'brand',
    isActive: true,
    description: 'High-quality disposable medical products for wound care, exam, and procedure use.',
    logo: {
      url: '/api/bunny/brands/dukal.svg',
      altText: 'Dukal logo',
      width: 1486,
      height: 302,
    },
    intro: 'Dukal Corporation manufactures high-quality disposable medical products including gauze sponges, wound dressings, exam gloves, and surgical drapes trusted by healthcare facilities across the United States.',
    productCategories: ['wound-care', 'surgical', 'exam-room', 'gauze'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'wound-care', title: 'Wound Care' },
      { handle: 'surgery-procedure', title: 'Surgical Supplies' },
      { handle: 'exam-room', title: 'Exam Room' },
    ],
    seoTitle: 'Dukal Medical Products | MDSupplies',
    seoDescription: 'Shop Dukal wound care, surgical, and disposable medical products through MDSupplies.',
  },
  {
    slug: 'dynarex',
    name: 'Dynarex',
    vendorName: 'Dynarex',
    type: 'brand',
    isActive: true,
    description: 'Dependable general medical products trusted by healthcare providers nationwide.',
    logo: {
      url: '/api/bunny/brands/dynarex.png',
      altText: 'Dynarex logo',
      width: 270,
      height: 90,
    },
    intro: 'Dynarex is one of the largest manufacturers of general medical products in the United States, offering thousands of SKUs across gloves, wound care, personal protective equipment, and exam room essentials.',
    productCategories: ['gloves', 'wound-care', 'face-masks', 'exam-room'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'gloves', title: 'Disposables' },
      { handle: 'face-masks', title: 'PPE' },
      { handle: 'wound-care', title: 'Wound Care' },
    ],
    seoTitle: 'Dynarex Medical Products | MDSupplies',
    seoDescription: 'Shop Dynarex gloves, wound care, and disposable medical supplies through MDSupplies.',
  },
  {
    slug: 'drive-medical',
    name: 'Drive Medical',
    vendorName: 'Drive Medical',
    type: 'brand',
    isActive: true,
    description: 'Durable medical equipment and mobility solutions for healthcare.',
    logo: {
      url: '/api/bunny/brands/drive-medical.svg',
      altText: 'Drive Medical logo',
      width: 431,
      height: 164,
    },
    intro: 'Drive Medical designs and manufactures durable medical equipment trusted by healthcare facilities and home health providers worldwide, including wheelchairs, walkers, and patient aids.',
    productCategories: ['dme', 'mobility-aids', 'home-health'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'mobility', title: 'Mobility & Durable Equipment' },
    ],
    seoTitle: 'Drive Medical Products | MDSupplies',
    seoDescription: 'Shop Drive Medical durable medical equipment and mobility aids.',
  },
  {
    slug: 'kadara',
    name: 'Kadara Medical',
    vendorName: 'Kadara',
    type: 'brand',
    isActive: true,
    description: 'Innovative medical supply solutions focused on quality and clinical performance.',
    logo: {
      url: '/api/bunny/brands/kadara.avif',
      altText: 'Kadara Medical logo',
      width: 448,
      height: 105,
    },
    intro: 'Kadara designs innovative medical supplies built for clinical performance and reliability. Their product line emphasizes quality manufacturing standards and consistent delivery for healthcare providers.',
    productCategories: ['medical-supplies', 'clinical-products'],
    featuredProducts: [],
    relatedCategories: [],
    seoTitle: 'Kadara Medical Supply Products | MDSupplies',
    seoDescription: 'Shop Kadara innovative medical supply solutions through MDSupplies.',
  },
  {
    slug: 'kemp-usa',
    name: 'Kemp USA',
    vendorName: 'Kemp USA',
    type: 'brand',
    isActive: true,
    description: 'Professional-grade medical equipment and emergency response supplies.',
    logo: {
      url: '/api/bunny/brands/kemp-usa.svg',
      altText: 'Kemp USA logo',
      width: 500,
      height: 251,
    },
    intro: 'Kemp USA manufactures professional-grade medical and emergency response equipment including stretchers, backboards, first aid kits, and AED supplies used by first responders and healthcare facilities.',
    productCategories: ['emergency', 'first-aid', 'stretchers', 'aed'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'emergency-supplies', title: 'Emergency & First Aid' },
    ],
    seoTitle: 'Kemp USA Emergency & Medical Equipment | MDSupplies',
    seoDescription: 'Shop Kemp USA medical equipment and emergency response supplies through MDSupplies.',
  },
  {
    slug: 'graham-field',
    name: 'Graham Field',
    vendorName: 'Graham Field',
    type: 'brand',
    isActive: true,
    description: 'Comprehensive durable medical equipment and rehabilitation solutions.',
    logo: {
      url: '/api/bunny/brands/graham-field.svg',
      altText: 'Graham Field logo',
      width: 558,
      height: 144,
    },
    intro: 'Graham Field Health Products is a leading manufacturer and distributor of durable medical equipment and rehabilitation products. Their brands—including Lumex and Everest & Jennings—serve patients from acute care to home health settings.',
    productCategories: ['dme', 'rehabilitation', 'patient-care', 'mobility-aids'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'mobility', title: 'Durable Medical Equipment' },
      { handle: 'patient-therapy-rehab', title: 'Rehabilitation' },
    ],
    seoTitle: 'Graham Field Medical Products | MDSupplies',
    seoDescription: 'Shop Graham Field durable medical equipment and rehabilitation solutions through MDSupplies.',
  },
  {
    slug: 'truecare',
    name: 'TrueCare Biomedix',
    vendorName: 'TrueCare',
    type: 'brand',
    isActive: true,
    description: 'Patient-centered wound care and disposable medical supply solutions.',
    logo: {
      url: '/api/bunny/brands/truecare.svg',
      altText: 'TrueCare Biomedix logo',
      width: 204,
      height: 44,
    },
    intro: 'TrueCare develops patient-centered wound care and disposable medical supplies that prioritize comfort and clinical effectiveness. Their products are designed for consistent performance in wound management and daily patient care.',
    productCategories: ['wound-care', 'exam-room', 'patient-care'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'wound-care', title: 'Wound Care' },
      { handle: 'exam-room', title: 'Disposables' },
    ],
    seoTitle: 'TrueCare Wound Care & Disposable Supplies | MDSupplies',
    seoDescription: 'Shop TrueCare wound care and disposable medical supply solutions through MDSupplies.',
  },
  {
    slug: 'dawn-mist',
    name: 'Dawn Mist',
    vendorName: 'Dawn Mist',
    type: 'brand',
    isActive: true,
    description: 'Premium personal care and hygiene products for healthcare facilities.',
    logo: {
      url: '/api/bunny/brands/dawn-mist.avif',
      altText: 'Dawn Mist logo',
      width: 128,
      height: 64,
    },
    intro: 'Dawn Mist is a leading brand of personal care products trusted by hospitals and long-term care facilities across North America.',
    productCategories: ['personal-care', 'hygiene', 'bath-supplies'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'hygiene', title: 'Personal Care & Hygiene' },
    ],
    seoTitle: 'Dawn Mist Products | MDSupplies',
    seoDescription: 'Browse Dawn Mist personal care and hygiene products available through MDSupplies.',
  },
  // 'lumex' was REMOVED (2026-10-02), not just disabled: it is not a Shopify
  // vendor at all. Every "LUMEX"-named product (57 of them, live-checked) has
  // `vendor: "Graham Field"` — Lumex is one of Graham Field's own sub-brands
  // (Graham Field's own intro text already said so). A standalone Partner row
  // with vendorName 'Lumex' matched zero products by construction, since
  // partnerForVendor matches the exact Shopify vendor string — this page was
  // permanently empty. The client's own example for this exact defect: "if a
  // brand such as Lumex belongs under Graham Field, it should still be
  // represented under the Graham Field partner structure instead of being
  // treated as its own partner." No vendor-alias mechanism is needed to fix
  // it — Graham Field's existing vendorName already covers these products.
  {
    slug: 'jant-pharmacal',
    name: 'Jant Pharmacal',
    vendorName: 'Jant Pharmacal',
    type: 'brand',
    isActive: true,
    description: 'Laboratory and point-of-care diagnostic tests for clinical and CLIA-waived settings.',
    // Logo: official Jant Pharmacal Corporation wordmark (client-supplied
    // source asset), background removed and re-encoded to WebP (640x145,
    // ~43KB) so it survives the hero's `brightness-0 invert` treatment the
    // same way every other partner logo on this page does — a logo with a
    // baked-in opaque background would render as a solid white rectangle
    // there. Uploaded to the same BunnyCDN brands/ zone every other partner
    // logo resolves from.
    logo: {
      url: '/api/bunny/brands/jant-pharmacal.webp',
      altText: 'Jant Pharmacal Corporation logo',
      width: 640,
      height: 145,
    },
    intro: 'Jant Pharmacal Corporation (Accutest / Accustrip) manufactures rapid diagnostic tests and point-of-care supplies, including multi-panel drug tests, urinalysis strips and readers, and rapid tests for conditions such as mononucleosis and H. pylori, for clinical and CLIA-waived laboratory settings.',
    productCategories: ['diagnostics', 'rapid-tests', 'point-of-care', 'drug-testing'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'testing-screening', title: 'Testing & Screening' },
    ],
    seoTitle: 'Jant Pharmacal Diagnostic Products | MDSupplies',
    seoDescription: 'Shop Jant Pharmacal (Accutest / Accustrip) rapid diagnostic tests and point-of-care supplies through MDSupplies.',
  },
  // ── The 5 entries below use logo files ALREADY verified & uploaded to
  // BunnyCDN for the "Brands We Carry" grid (lib/brands.ts) — confirmed via
  // scripts/audit-brand-logos.ts's visibility check, so no re-upload or
  // white-on-white risk here. Added 2026-10-02 toward the client's approved
  // 19-partner list; each vendorName is the EXACT live Shopify `vendor` field
  // value (verified via Storefront API product search against the QA store),
  // which is what the partner page's `vendor:"..."` product query requires —
  // not necessarily the approved display `name`, see TLC DME below.
  {
    slug: 'trocar-supplies',
    name: 'Trocar Supplies',
    vendorName: 'Trocar Supplies',
    type: 'brand',
    isActive: true,
    description: 'Trocars and trocar kits for laparoscopic and minimally invasive procedures.',
    logo: {
      url: '/api/bunny/brands/trocar-supplies.avif',
      altText: 'Trocar Supplies logo',
      width: 410,
      height: 195,
    },
    intro: 'Trocar Supplies manufactures disposable and reusable trocars, trocar kits, and related laparoscopic access instruments in a range of sizes for clinical and procedural use.',
    productCategories: ['surgical', 'trocars', 'laparoscopic'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'trocars-trocar-kits', title: 'Trocars & Trocar Kits' },
      { handle: 'surgery-procedure', title: 'Surgery & Procedure' },
    ],
    seoTitle: 'Trocar Supplies Products | MDSupplies',
    seoDescription: 'Shop Trocar Supplies trocars and trocar kits through MDSupplies.',
  },
  {
    slug: 'rx-systems',
    name: 'Rx Systems',
    vendorName: 'Rx Systems',
    type: 'vendor',
    isActive: true,
    description: 'Pharmacy labels, vials, and compounding supplies for retail and institutional pharmacies.',
    logo: {
      url: '/api/bunny/brands/rx-systems.png',
      altText: 'Rx Systems logo',
      width: 223,
      height: 56,
    },
    intro: 'Rx Systems supplies pharmacy labels, prescription vials, compounding materials, and related dispensing supplies for retail and institutional pharmacies.',
    productCategories: ['pharmacy', 'labels', 'vials', 'compounding'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'pharmacy-products', title: 'Pharmacy Products' },
    ],
    seoTitle: 'Rx Systems Pharmacy Products | MDSupplies',
    seoDescription: 'Shop Rx Systems pharmacy labels, vials, and compounding supplies through MDSupplies.',
  },
  {
    // Approved display name is "TLC DME" (client's partner list); the live
    // Shopify vendor field on every one of this vendor's products reads "TLC
    // Medical" (verified via Storefront API, 15 active products — ankle/knee
    // braces). vendorName must stay the LITERAL Shopify string or the
    // `vendor:"..."` product query below returns zero results. Flagged to
    // Izzy to confirm whether the Shopify vendor field itself should be
    // renamed, rather than silently guessed here.
    slug: 'tlc-dme',
    name: 'TLC DME',
    vendorName: 'TLC Medical',
    type: 'brand',
    isActive: true,
    description: 'Orthopedic braces and durable medical equipment for patient support and recovery.',
    logo: {
      url: '/api/bunny/brands/tlc-dme.png',
      altText: 'TLC DME logo',
      width: 81,
      height: 90,
    },
    intro: 'TLC DME supplies orthopedic braces and supports — including hinged ankle and knee braces — along with other durable medical equipment for patient recovery and daily support.',
    productCategories: ['dme', 'orthopedic-braces', 'rehabilitation'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'patient-therapy-rehab', title: 'Patient Therapy & Rehab' },
    ],
    seoTitle: 'TLC DME Orthopedic Products | MDSupplies',
    seoDescription: 'Shop TLC DME orthopedic braces and durable medical equipment through MDSupplies.',
  },
  {
    slug: 'first-glove',
    name: 'First Glove',
    vendorName: 'First Glove',
    type: 'brand',
    isActive: true,
    description: 'Nitrile exam and industrial gloves for clinical and general-purpose use.',
    logo: {
      url: '/api/bunny/brands/first-glove.webp',
      altText: 'First Glove logo',
      width: 260,
      height: 20,
    },
    intro: 'First Glove manufactures nitrile exam and industrial gloves in a range of thicknesses and sizes for clinical, laboratory, and general-purpose use.',
    productCategories: ['gloves', 'nitrile', 'exam'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'gloves', title: 'Gloves' },
    ],
    seoTitle: 'First Glove Products | MDSupplies',
    seoDescription: 'Shop First Glove nitrile exam and industrial gloves through MDSupplies.',
  },
  {
    // Only 1 active product for this vendor in the QA catalog (a CLIA-waived
    // multi-drug rapid test cup) — thin, but it IS the exact live vendor
    // string (verified), on the client's approved 19-partner list, and has a
    // verified non-broken logo already uploaded. Flag to Izzy: confirm
    // whether more CLIAwaived products exist in production than this QA
    // store carries (same gap pattern found for CorDx/Respiratory Testing).
    slug: 'cliawaived',
    name: 'CLIAwaived, Inc',
    vendorName: 'CLIAwaived, Inc',
    type: 'vendor',
    isActive: true,
    description: 'CLIA-waived rapid diagnostic and drug testing products for point-of-care use.',
    logo: {
      url: '/api/bunny/brands/cliawaived.png',
      altText: 'CLIAwaived, Inc logo',
      width: 225,
      height: 225,
    },
    intro: 'CLIAwaived, Inc. supplies CLIA-waived rapid diagnostic and drug testing products designed for point-of-care use in clinical and office-based settings.',
    productCategories: ['diagnostics', 'rapid-tests', 'drug-testing'],
    featuredProducts: [],
    relatedCategories: [
      { handle: 'testing-screening', title: 'Testing & Screening' },
    ],
    seoTitle: 'CLIAwaived Diagnostic Products | MDSupplies',
    seoDescription: 'Shop CLIAwaived, Inc. CLIA-waived rapid diagnostic and drug testing products through MDSupplies.',
  },
]

export function getPartnerBySlug(slug: string): Partner | undefined {
  return PARTNERS.find((p) => p.slug === slug)
}

/** Active partners in approved alphabetical order (E8 §6.2). */
export function getActivePartners(): Partner[] {
  return PARTNERS.filter((p) => p.isActive).sort((a, b) =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }),
  )
}

/**
 * Normalize a raw Shopify `product.vendor` string for alias matching: lowercase,
 * strip a trailing corporate suffix (Inc/LLC/Corp/Co/Ltd), drop punctuation, and
 * collapse whitespace. Used to reconcile imported vendor strings with the
 * approved partner registry (E8: "normalize aliases post-import").
 */
function normalizeVendor(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,]/g, ' ')
    .replace(/\b(inc|llc|corp|corporation|co|ltd|company)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Resolve a (possibly aliased) Shopify vendor string to its approved Partner. */
export function partnerForVendor(vendor: string): Partner | undefined {
  const normalized = normalizeVendor(vendor)
  if (!normalized) return undefined
  return PARTNERS.find((p) => normalizeVendor(p.vendorName) === normalized)
}
