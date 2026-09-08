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

  // SEO-CATEGORY-01 (2026-09-05 Izzy brief, docs/audits/2026-09-07-seo-
  // category-01/ and the mdsupplies-category-briefs-2026-09-05 package):
  // this entry replaces a dev-authored version shipped 2026-09-07 during a
  // self-audit session that had no externally-authored brief available yet
  // — a violation of the ticket's own rule ("Sardor does not choose target
  // keywords, rewrite metadata, invent FAQs, or independently add SEO
  // copy"). Every field below is Izzy's copy verbatim, not the earlier
  // dev-authored version. Evidence: Search Console 2026-06-05–2026-09-02,
  // 100 clicks / 5,415 impressions / avg position 10.8 — the best-performing
  // non-branded category page on the domain; Ahrefs organic keywords
  // 2026-09-02; live Playwright audit 2026-09-02.
  'trocars-trocar-kits': {
    route: '/category/trocars-trocar-kits',
    pageType: 'category',
    primaryKeyword: 'trocar kit',
    secondaryKeywords: [
      'trocar kits',
      'disposable trocar kits',
      'trocar supplies',
      'reusable trocars',
      '3.2mm trocar',
      '3.5mm trocar',
      '4.5mm trocar',
    ],
    searchIntent:
      'transactional. Clinical buyer sourcing disposable or reusable trocars and trocar kits for procedural, surgical, and hormone pellet insertion use',
    targetAudience:
      'HRT and hormone pellet clinics, ambulatory surgery centers, urgent care procedural rooms, OR supply coordinators',
    title: 'Trocars & Trocar Kits | 3.2mm, 3.5mm, 4.5mm | MDSupplies',
    metaDescription:
      'Shop disposable and reusable trocars and trocar kits at wholesale prices, in 3.2mm, 3.5mm, and 4.5mm sizes for hormone pellet insertion and surgical procedures. Kits and trocar-only options available.',
    h1: 'Trocars & Trocar Kits',
    answerBlock:
      'MDSupplies carries disposable and reusable trocars and trocar kits in 3.2mm, 3.5mm, and 4.5mm sizes for hormone pellet insertion, surgical, and procedural use at wholesale prices.',
    contentSections: [
      {
        h2: 'Disposable vs. Reusable Trocars',
        body:
          'Disposable trocar kits arrive pre-sterilized and ready for single use, eliminating reprocessing between procedures. Reusable trocars are built for repeat sterilization cycles and lower per-procedure cost at higher volume. MDSupplies carries both in every size below.',
      },
      {
        h2: 'Trocar Sizing Guide',
        body:
          '3.2mm and 3.5mm trocars are the standard sizes for hormone pellet insertion in HRT clinics. 4.5mm trocars suit larger-gauge procedural use. Kits are available with or without the trocar for practices restocking components separately.',
      },
    ],
    faqs: CATEGORY_FAQS['trocars-trocar-kits'] ?? [],
    // Mechanism caveat (Izzy brief, per her own finding): this field renders
    // nowhere — see the cluster-links.ts note above. Routed through
    // CLUSTER_LINKS['trocars-trocar-kits'].categoryLinks instead, updated to
    // match this list.
    internalLinks: [
      '/category/needles-syringes',
      '/category/surgery-procedure',
      '/category/procedure-tray',
      '/industries/hrt-clinics',
    ],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] [size] [disposable/reusable] trocar kit for procedural use',
    croNotes: 'Highest CPC cluster on the domain ($133-246); surface HRT/pellet-clinic bulk reorder path and case pricing prominently.',
    priority: 'P0',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-09-02',
  },

  // The remaining 17 entries below are all sourced verbatim from Izzy's
  // 2026-09-05 category-briefs package (docs reference:
  // mdsupplies-category-briefs-2026-09-05.zip, README.md priority table) —
  // no keyword, title, description, FAQ, or content-section text here was
  // authored by Sardor. Each brief's own evidence section (Search Console,
  // Ahrefs, live Playwright audits, SERP overviews) is preserved in the
  // source .md files, not duplicated into code comments here.

  'walking-boots': {
    route: '/category/walking-boots',
    pageType: 'category',
    primaryKeyword: 'orthopedic walking boot',
    secondaryKeywords: ['orthopedic boot', 'fracture boot', 'walking boot accessories', 'post-op walking boot', 'ankle walking boot'],
    searchIntent: 'transactional. Clinic or patient-supply buyer sourcing orthopedic walking boots for fracture, sprain, or post-surgical recovery',
    targetAudience: 'Orthopedic and urgent care clinic buyers, physical therapy practices, home health agencies',
    title: 'Orthopedic Walking Boots & Fracture Boots | MDSupplies',
    metaDescription:
      'Shop orthopedic walking boots and fracture boots for ankle and foot injuries. Lightweight, adjustable, high-top and low-top styles for sprains through post-surgical recovery.',
    h1: 'Orthopedic Walking Boots',
    answerBlock:
      'MDSupplies carries orthopedic walking boots and fracture boots in high-top and low-top styles, from mild sprains through post-surgical recovery, at wholesale prices for clinics and home health agencies.',
    contentSections: [
      {
        h2: 'Comfort and Fit',
        body:
          'Walking boots are designed to immobilize and support the injured foot or ankle while reducing discomfort during recovery. MDSupplies stocks boots with adjustable straps and cushioned liners across a range of sizes for a secure, comfortable fit.',
      },
    ],
    faqs: CATEGORY_FAQS['walking-boots'] ?? [],
    internalLinks: ['/category/patient-therapy-rehab', '/industries/home-health', '/industries/urgent-care'],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] [high-top/low-top] orthopedic walking boot, size [size]',
    croNotes: 'Both ranking keywords use "orthopedic," which the current title and H1 omit entirely; this is the single highest-leverage fix on this page.',
    priority: 'P0',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-09-02',
  },

  'fiberglass-tape': {
    route: '/category/fiberglass-tape',
    pageType: 'category',
    primaryKeyword: 'fiberglass cast tape',
    secondaryKeywords: ['cast tape', 'fiberglass casting tape', 'orthopedic casting tape', 'cast tape colors', 'fiberglass bandage'],
    searchIntent: 'transactional. Clinical buyer sourcing fiberglass casting tape for orthopedic immobilisation',
    targetAudience: 'Urgent care centers, orthopedic clinics, and casting rooms',
    title: 'Fiberglass Cast Tape | Casting Tape & Colors | MDSupplies',
    metaDescription:
      'Shop fiberglass cast tape at wholesale prices, durable, lightweight, and water-activated casting tape in a range of widths and colors for orthopedic immobilisation.',
    h1: 'Fiberglass Cast Tape',
    answerBlock:
      'MDSupplies carries fiberglass cast tape in a range of widths and colors, water-activated and lightweight, for orthopedic casting in urgent care centers and clinics.',
    contentSections: [],
    faqs: [],
    internalLinks: ['/category/casting-products', '/category/patient-therapy-rehab', '/industries/urgent-care'],
    schemaTypes: ['BreadcrumbList', 'CollectionPage'],
    imageAltPattern: '[Brand] fiberglass cast tape, [width], [color]',
    croNotes: 'Best real visibility of the unbriefed candidates (505 impressions at position 37.7). Colour and width are the buying attributes, keep those filters obvious.',
    priority: 'P1',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-09-02',
  },

  'toilet-safety-rails': {
    route: '/category/toilet-safety-rails',
    pageType: 'category',
    primaryKeyword: 'toilet safety rails',
    secondaryKeywords: ['toilet safety frame', 'toilet support rails', 'bathroom safety rails', 'adjustable toilet rails'],
    searchIntent: 'transactional. Home care or facility buyer sourcing toilet safety rails for fall prevention and bathroom support',
    targetAudience: 'Home health agencies, long-term care facilities, home care buyers equipping patient bathrooms',
    title: 'Toilet Safety Rails | Adjustable Support Frames | MDSupplies',
    metaDescription:
      'Shop adjustable toilet safety rails for secure support and fall prevention in home care and facility bathrooms. Easy to install, at wholesale prices.',
    h1: 'Toilet Safety Rails',
    answerBlock:
      'MDSupplies carries adjustable toilet safety rails that provide secure support and help prevent falls in home care and facility bathrooms, at wholesale prices for home health agencies and long-term care.',
    contentSections: [],
    faqs: CATEGORY_FAQS['toilet-safety-rails'] ?? [],
    internalLinks: ['/category/bathroom', '/category/home-care', '/industries/home-health'],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] adjustable toilet safety rail, [width] frame',
    croNotes: 'Fall-prevention framing is the buying trigger here, keep it in the copy. 7 active products, thinnest assortment in this batch, so avoid implying a broad range.',
    priority: 'P1',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-09-02',
  },

  'swabsticks': {
    route: '/category/swabsticks',
    pageType: 'category',
    primaryKeyword: 'medical swabsticks',
    secondaryKeywords: ['swabsticks', 'antiseptic swabsticks', 'povidone-iodine swabsticks', 'alcohol swabsticks', 'oral swabsticks'],
    searchIntent: 'transactional. Clinical or facility buyer restocking swabsticks for antiseptic skin prep, oral care, or wound care',
    targetAudience: 'Urgent care centers, clinics, long-term care facilities, home health agencies',
    title: 'Medical Swabsticks | Antiseptic, Oral & Iodine | MDSupplies',
    metaDescription:
      'Shop medical swabsticks at wholesale prices, including alcohol, povidone-iodine, lemon glycerin, and oral swabsticks in sterile single-use packs for clinical use.',
    h1: 'Swabsticks',
    answerBlock:
      'MDSupplies carries medical swabsticks for antiseptic skin prep, oral care, and wound care, including alcohol, povidone-iodine, lemon glycerin, and oral types, in sterile single-use packs.',
    contentSections: [],
    faqs: [],
    internalLinks: ['/category/skin-preparation', '/category/povidone-iodine-swabsticks', '/industries/urgent-care'],
    schemaTypes: ['BreadcrumbList', 'CollectionPage'],
    imageAltPattern: '[Brand] [type] swabsticks, sterile, [count] per pack',
    // Izzy's brief also flags a grammar error ("we provides reliable
    // solutions") in this collection's live Shopify body copy — that's
    // merchandising-owned CMS content, not something this registry controls;
    // needs a Shopify Admin edit, not a code change.
    croNotes: '"medical swabsticks" is 104 of this page\'s 135 impressions, so lead the title with that phrasing rather than the bare category name.',
    priority: 'P1',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-09-02',
  },

  'patient-belongings-bags': {
    route: '/category/patient-belongings-bags',
    pageType: 'category',
    primaryKeyword: 'patient belonging bags',
    secondaryKeywords: ['hospital belongings bags', 'patient supply bags', 'patient valet bags', 'drawstring patient bags'],
    searchIntent: 'transactional. Facility buyer sourcing bags to store and transport patient personal items',
    targetAudience: 'Hospitals, clinics, long-term care facilities, home health agencies managing patient transfers',
    title: 'Patient Belonging Bags | Hospital Personal Item Bags | MDSupplies',
    metaDescription:
      'Shop patient belonging bags at wholesale prices, in drawstring and rigid handle styles and a range of sizes, for hospitals, clinics, and long-term care facilities.',
    h1: 'Patient Belonging Bags',
    answerBlock:
      'MDSupplies carries patient belonging bags for storing and transporting personal items in healthcare settings, in drawstring and rigid handle closures across a range of sizes and materials.',
    contentSections: [],
    faqs: [],
    internalLinks: ['/category/housekeeping-janitorial', '/category/reclosable-bags', '/industries/home-health'],
    schemaTypes: ['BreadcrumbList', 'CollectionPage'],
    imageAltPattern: '[Brand] patient belongings bag, [closure type], [size]',
    // Izzy's brief also flags a sentence-fragment defect in this collection's
    // live Shopify body copy — merchandising-owned CMS content, needs a
    // Shopify Admin edit, not a code change.
    croNotes: 'Best average position (25.0) of this batch on small volume.',
    priority: 'P1',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-09-02',
  },

  'patient-bibs': {
    route: '/category/patient-bibs',
    pageType: 'category',
    primaryKeyword: 'patient bibs',
    secondaryKeywords: ['medical bibs', 'adult patient bibs', 'disposable bibs', 'dental bibs', 'tie-back bibs'],
    searchIntent: 'transactional. Facility or practice buyer sourcing disposable bibs for patient feeding, exam, or dental use',
    targetAudience: 'Long-term care facilities, clinics, dental practices',
    title: 'Patient Bibs | Adult, Disposable & Dental | MDSupplies',
    metaDescription:
      'Shop disposable patient bibs at wholesale prices, adult tie-back and over-the-head styles plus 2-ply and 3-ply dental bibs, for care facilities and practices.',
    h1: 'Patient Bibs',
    // Scope-of-copy fix, not a metadata-only add: the existing body copy
    // described dental bibs exclusively while the page ranks on
    // patient/medical-framed queries and the live assortment is mixed
    // (adult clinical bibs + dental bibs + bib clips, verified against the
    // Shopify Admin API 2026-09-05). This answerBlock covers both halves.
    answerBlock:
      'MDSupplies carries disposable patient bibs including adult tie-back and over-the-head styles for feeding and patient care, plus 2-ply and 3-ply dental bibs and bib clips, at wholesale prices.',
    contentSections: [],
    faqs: [],
    internalLinks: ['/category/dental', '/category/patient-therapy-rehab', '/industries/clinics-doctors-offices'],
    schemaTypes: ['BreadcrumbList', 'CollectionPage'],
    imageAltPattern: '[Brand] [adult/dental] bib, [ply], [closure type]',
    croNotes: 'The existing copy described only dental bibs while the page ranks for "patient bibs" and the assortment includes adult clinical bibs. Correcting that scope mismatch is the main change here, not the truncation.',
    priority: 'P1',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-09-02',
  },

  'wheelchair-parts': {
    route: '/category/wheelchair-parts',
    pageType: 'category',
    primaryKeyword: 'wheelchair parts',
    secondaryKeywords: ['wheelchair accessories', 'wheelchair footrests', 'wheelchair armrests', 'caster wheels', 'replacement wheelchair parts'],
    searchIntent: 'transactional. Buyer sourcing replacement wheelchair components and accessories to repair or upgrade existing equipment',
    targetAudience: 'Home health agencies, long-term care facilities, and DME maintenance staff servicing existing wheelchairs',
    title: 'Wheelchair Parts & Accessories | Replacement Components | MDSupplies',
    metaDescription:
      'Shop wheelchair parts and accessories at wholesale prices, footrests, armrests, caster wheels, tires, and upholstery, compatible with leading wheelchair brands.',
    h1: 'Wheelchair Parts',
    answerBlock:
      'MDSupplies carries wheelchair parts and accessories including footrests, armrests, caster wheels, tires, and upholstery, compatible with leading brands, at wholesale prices for home health agencies and care facilities.',
    contentSections: [],
    faqs: CATEGORY_FAQS['wheelchair-parts'] ?? [],
    internalLinks: ['/category/mobility', '/category/wheelchair-cushions', '/industries/home-health'],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] wheelchair [component type] replacement part',
    croNotes: 'Repair/replacement intent means buyers arrive knowing the part they need. Surface compatibility and size filters prominently rather than lifestyle framing.',
    priority: 'P1',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-09-02',
  },

  'first-aid-kits': {
    route: '/category/first-aid-kits',
    pageType: 'category',
    primaryKeyword: 'first aid kits',
    secondaryKeywords: ['wholesale first aid kits', 'bulk first aid kits', 'emergency first aid kits', 'facility first aid kits'],
    searchIntent: 'transactional. Facility buyer sourcing first aid kits for emergency preparedness',
    targetAudience: 'Urgent care centers, clinics, and facility safety coordinators stocking emergency response supplies',
    title: 'First Aid Kits | Wholesale & Bulk | MDSupplies',
    metaDescription:
      'Shop first aid kits stocked with bandages, antiseptics, and medical tools at wholesale prices for clinics, urgent care, and emergency-response facilities.',
    h1: 'First Aid Kits',
    answerBlock:
      'MDSupplies carries first aid kits stocked with bandages, antiseptics, and medical tools at wholesale prices for clinics, urgent care centers, and facilities preparing for emergency response.',
    contentSections: [],
    faqs: CATEGORY_FAQS['first-aid-kits'] ?? [],
    internalLinks: ['/category/emergency-supplies', '/industries/urgent-care', '/industries/clinics-doctors-offices'],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] first aid kit, [item count]-piece',
    croNotes: 'KD 30 is the highest of this batch, real competitors (mymedic, Red Cross) are established brands. Differentiation should lean on wholesale/bulk framing, which none of the top competitors emphasize.',
    priority: 'P1',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-09-02',
  },

  'insulin-pen-needles': {
    route: '/category/insulin-pen-needles',
    pageType: 'category',
    primaryKeyword: 'insulin pen needles',
    secondaryKeywords: ['pen needles', 'ultra-fine pen needles', '31g pen needles', '32g pen needles', 'diabetic pen needles'],
    searchIntent: 'transactional. Clinical or facility buyer sourcing insulin pen needles for subcutaneous delivery',
    targetAudience: 'Diabetes clinic buyers, home health agencies, long-term care facility procurement',
    title: 'Insulin Pen Needles | All Gauges | MDSupplies',
    metaDescription:
      'Shop insulin pen needles at wholesale prices, 29G to 33G, ultra-fine, compatible with most insulin pens, for precise and comfortable subcutaneous delivery.',
    h1: 'Insulin Pen Needles',
    answerBlock:
      'MDSupplies carries insulin pen needles from 29G to 33G, ultra-fine and compatible with most insulin pens, at wholesale prices for clinics, home health agencies, and long-term care facilities.',
    contentSections: [
      {
        h2: 'Gauge and Length Options',
        body:
          'MDSupplies stocks insulin pen needles across 29G, 30G, 31G, 32G, and 33G, in lengths from 4mm to 12.7mm, so facilities can match the gauge and depth their patients already use when reordering.',
      },
    ],
    faqs: CATEGORY_FAQS['insulin-pen-needles'] ?? [],
    internalLinks: ['/category/needles-syringes', '/industries/home-health', '/industries/pharmacies'],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] insulin pen needle, [gauge]G x [length]mm',
    croNotes: 'Largest single-keyword volume of the three Tier 1 pages (4,100/mo); naming exact gauges in body copy targets the gauge-specific long tail currently only captured by individual product pages.',
    priority: 'P0',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-09-02',
  },

  'blood-collection-tubes': {
    route: '/category/blood-collection-tubes',
    pageType: 'category',
    primaryKeyword: 'blood collection tubes',
    secondaryKeywords: ['EDTA tubes', 'heparin tubes', 'clot activator tubes', 'serum separator tubes', 'phlebotomy tubes'],
    searchIntent: 'transactional. Laboratory or clinical buyer restocking blood collection tubes by additive type',
    targetAudience: 'Clinical laboratories, outpatient practices running in-house draws, phlebotomy services',
    title: 'Blood Collection Tubes | EDTA, Heparin & Clot Activator | MDSupplies',
    metaDescription:
      'Shop blood collection tubes at wholesale prices, with EDTA, heparin, and clot activator additives for diagnostic testing in clinical labs and healthcare settings.',
    h1: 'Blood Collection Tubes',
    answerBlock:
      'MDSupplies carries blood collection tubes with EDTA, heparin, and clot activator additives, matched to the requirements of different diagnostic tests, for clinical laboratories and healthcare settings.',
    contentSections: [],
    faqs: CATEGORY_FAQS['blood-collection-tubes'] ?? [],
    internalLinks: ['/category/testing-screening', '/category/blood-collection-sets', '/industries/clinics-doctors-offices'],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] blood collection tube, [additive type], [volume]',
    croNotes: 'Thinnest assortment of this batch (5 products) against the highest KD (32) and a manufacturer-dominated SERP. Low expectations; revisit tier if assortment grows.',
    priority: 'P2',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-09-02',
  },

  'surgical-gloves': {
    route: '/category/surgical-gloves',
    pageType: 'category',
    primaryKeyword: 'surgical gloves',
    secondaryKeywords: ['sterile surgical gloves', 'latex surgical gloves', 'nitrile surgical gloves', 'polyisoprene gloves', 'powder-free surgical gloves'],
    searchIntent: 'transactional. Clinical buyer sourcing sterile surgical gloves for procedural and operating-room use',
    targetAudience: 'Surgery centers, urgent care procedural rooms, dental and outpatient clinics',
    title: 'Surgical Gloves | Latex, Nitrile & Polyisoprene | MDSupplies',
    metaDescription:
      'Shop sterile surgical gloves at wholesale prices, latex, nitrile, and polyisoprene, in powder-free and chemo-tested options for surgery centers and clinics.',
    h1: 'Surgical Gloves',
    answerBlock:
      'MDSupplies carries sterile surgical gloves in latex, nitrile, and polyisoprene, including powder-free and chemo-tested options meeting ASTM standards, at wholesale prices for surgery centers, clinics, and dental practices.',
    contentSections: [],
    // Izzy's brief also flags an intermittent "SOMETHING WENT WRONG /
    // Category Unavailable" load failure on this route (support code
    // 0c289030, 2026-09-05) — a reliability bug, not an SEO defect. Not
    // fixed here; flagging for separate investigation.
    faqs: CATEGORY_FAQS['surgical-gloves'] ?? [],
    internalLinks: ['/category/gloves', '/industries/urgent-care', '/industries/clinics-doctors-offices'],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] sterile [material] surgical gloves, size [size]',
    croNotes: 'KD 0 at 5,500/mo, the best volume-to-difficulty ratio in this batch. Remove the shipping and superlative claims from existing copy before shipping.',
    priority: 'P1',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-09-02',
  },

  'wound-closure': {
    route: '/category/wound-closure',
    pageType: 'category',
    primaryKeyword: 'wound closure',
    secondaryKeywords: ['wound closure strips', 'butterfly closures', 'skin adhesive', 'laceration closure', 'adhesive wound closure'],
    searchIntent: 'transactional. Clinical or home-care buyer sourcing non-suture wound closure products',
    targetAudience: 'Urgent care centers, clinics handling laceration management, home health agencies',
    title: 'Wound Closure Strips & Skin Adhesives | MDSupplies',
    metaDescription:
      'Shop wound closure products at wholesale prices, sterile butterfly closures, skin adhesives, and reinforced closure strips for clinical and home care wound management.',
    h1: 'Wound Closure',
    answerBlock:
      'MDSupplies carries wound closure products including sterile butterfly closures, skin adhesives, and reinforced closure strips, used to close and protect wounds without sutures, for clinical and home care settings.',
    contentSections: [],
    faqs: CATEGORY_FAQS['wound-closure'] ?? [],
    internalLinks: ['/category/wound-care', '/category/surgical-sutures', '/industries/urgent-care'],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] [closure type] wound closure, [size]',
    croNotes: 'Buyers often arrive comparing closure strips against sutures, the cross-link to Surgical Sutures serves that comparison rather than losing the visit.',
    priority: 'P1',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-09-02',
  },

  'crutches-1': {
    route: '/category/crutches-1',
    pageType: 'category',
    primaryKeyword: 'crutches',
    secondaryKeywords: ['underarm crutches', 'forearm crutches', 'adjustable crutches', 'aluminum crutches', 'pediatric crutches'],
    searchIntent: 'transactional. Clinic or facility buyer sourcing crutches for patient mobility and recovery',
    targetAudience: 'Urgent care clinics, home health agencies, physical therapy practices sourcing patient mobility aids',
    title: 'Crutches | Underarm, Forearm & Adjustable | MDSupplies',
    metaDescription:
      'Shop lightweight aluminum crutches, underarm and adjustable forearm styles at wholesale prices for clinics, urgent care, and home health recovery needs.',
    h1: 'Crutches',
    answerBlock:
      'MDSupplies carries lightweight aluminum crutches in underarm and adjustable forearm styles at wholesale prices for clinics, urgent care centers, and home health agencies.',
    contentSections: [],
    faqs: CATEGORY_FAQS['crutches-1'] ?? [],
    internalLinks: ['/category/mobility', '/industries/urgent-care', '/industries/home-health'],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] [underarm/forearm] crutches, adjustable',
    croNotes: 'Large market demand (51,000/mo) but this page earns almost no impressions, so treat the fix as hygiene rather than a traffic play. The breadcrumb-leak defect in the meta description is still worth correcting, it is a visible bug.',
    priority: 'P1',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-09-02',
  },

  'alcohol-prep-pads': {
    route: '/category/alcohol-prep-pads',
    pageType: 'category',
    primaryKeyword: 'alcohol prep pads',
    secondaryKeywords: ['isopropyl alcohol pads', 'sterile alcohol wipes', 'alcohol swabs', 'bulk alcohol prep pads'],
    searchIntent: 'transactional. Clinical or facility buyer restocking alcohol prep pads for skin antisepsis',
    targetAudience: 'Urgent care centers, clinics, home health agencies, phlebotomy and injection settings',
    title: 'Alcohol Prep Pads | Sterile & Bulk | MDSupplies',
    metaDescription:
      'Shop sterile alcohol prep pads saturated with isopropyl alcohol, available in multiple sizes and bulk packs at wholesale prices for clinics and home health use.',
    h1: 'Alcohol Prep Pads',
    answerBlock:
      'MDSupplies carries sterile alcohol prep pads saturated with isopropyl alcohol for skin antisepsis, in multiple sizes and bulk packs, at wholesale prices for clinical, urgent care, and home health settings.',
    contentSections: [],
    faqs: CATEGORY_FAQS['alcohol-prep-pads'] ?? [],
    internalLinks: ['/category/skin-preparation', '/industries/urgent-care', '/industries/home-health'],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] sterile alcohol prep pads, [size], [count] per box',
    croNotes: 'High-turnover reorder consumable. Emphasize bulk/case pack availability, that is the differentiator against the consumer-retail results that share this SERP.',
    priority: 'P1',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-09-02',
  },

  'wheelchairs': {
    route: '/category/wheelchairs',
    pageType: 'category',
    primaryKeyword: 'wheelchairs',
    secondaryKeywords: ['manual wheelchairs', 'lightweight wheelchairs', 'reclining wheelchairs', 'pediatric wheelchairs', 'bariatric wheelchairs'],
    searchIntent: 'transactional. Facility or agency buyer sourcing wheelchairs for patient mobility',
    targetAudience: 'Home health agencies, long-term care facilities, clinics sourcing manual and specialty wheelchairs',
    title: 'Wheelchairs | Manual, Lightweight & Reclining | MDSupplies',
    metaDescription:
      'Shop manual, lightweight, reclining, and pediatric wheelchairs from Vive Health, Dynarex, and Bari+Max at wholesale prices for home care, clinics, and long-term care.',
    h1: 'Wheelchairs',
    answerBlock:
      'MDSupplies carries manual, lightweight, reclining, and pediatric wheelchairs from Vive Health, Dynarex, and Bari+Max at wholesale prices for home care agencies, clinics, and long-term care facilities.',
    contentSections: [],
    faqs: [],
    internalLinks: ['/category/mobility', '/industries/home-health', '/industries/clinics-doctors-offices'],
    schemaTypes: ['BreadcrumbList', 'CollectionPage'],
    imageAltPattern: '[Brand] [manual/lightweight/reclining/pediatric] wheelchair',
    croNotes: 'Real brand names already in the existing copy are a genuine asset, keep them prominent. Remove the unsupported shipping and "best value" claims before anything ships.',
    priority: 'P1',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-09-02',
  },

  'wheelchair-cushions': {
    route: '/category/wheelchair-cushions',
    pageType: 'category',
    primaryKeyword: 'wheelchair cushions',
    secondaryKeywords: ['wheelchair seat cushions', 'gel wheelchair cushion', 'foam wheelchair cushion', 'air wheelchair cushion', 'pressure relief cushion'],
    searchIntent: 'transactional. Facility or agency buyer sourcing wheelchair seat cushions for pressure relief and seating comfort',
    targetAudience: 'Home health agencies, long-term care facilities, clinics stocking seating and mobility accessories',
    title: 'Wheelchair Cushions | Foam, Gel & Air | MDSupplies',
    metaDescription:
      'Shop wheelchair cushions at wholesale prices, foam, gel, and air seat cushions for pressure relief and extended seating comfort in home care and clinical settings.',
    h1: 'Wheelchair Cushions',
    // Net-new copy — this route previously had no categorySeo.ts entry at
    // all and ran on the sitewide fallback description (see the README's
    // note on this page).
    answerBlock:
      'MDSupplies carries wheelchair seat cushions in foam, gel, and air constructions for pressure relief and seating comfort, at wholesale prices for home health agencies, long-term care facilities, and clinics.',
    contentSections: [
      {
        h2: 'Cushion Types',
        body:
          'Foam cushions are the most common general-use option and the lightest. Gel cushions distribute pressure across the seating surface and suit longer periods of sitting. Air cushions are adjustable and typically chosen where pressure relief is the primary concern. MDSupplies carries all three.',
      },
    ],
    faqs: CATEGORY_FAQS['wheelchair-cushions'] ?? [],
    internalLinks: ['/category/mobility', '/industries/home-health', '/industries/clinics-doctors-offices'],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] [foam/gel/air] wheelchair cushion, [size]',
    croNotes: 'Currently running on the sitewide fallback description with 42 products behind it, the largest content gap relative to assortment in this batch. Everything here is net-new copy.',
    priority: 'P1',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-09-02',
  },

  'syringe-with-needle': {
    route: '/category/syringe-with-needle',
    pageType: 'category',
    primaryKeyword: 'syringe with needle',
    secondaryKeywords: ['syringes with needles', 'hypodermic syringe', 'disposable syringes', 'luer lock syringe', 'sterile syringe needle'],
    searchIntent: 'transactional. Clinical or facility buyer sourcing pre-assembled syringe-and-needle units for injection or aspiration',
    targetAudience: 'Urgent care centers, clinics, HRT practices, veterinary clinics, home health agencies',
    title: 'Syringes with Needles | Sterile & Disposable | MDSupplies',
    metaDescription:
      'Shop sterile syringes with needles at wholesale prices, in a range of volumes and gauges for injection, aspiration, and general procedural use in clinical settings.',
    h1: 'Syringe with Needle',
    answerBlock:
      'MDSupplies carries sterile, disposable syringes with needles attached, across a range of volumes and gauges, at wholesale prices for clinics, urgent care centers, and veterinary practices.',
    contentSections: [],
    faqs: CATEGORY_FAQS['syringe-with-needle'] ?? [],
    internalLinks: ['/category/needles-syringes', '/category/insulin-pen-needles', '/industries/urgent-care'],
    schemaTypes: ['BreadcrumbList', 'CollectionPage', 'FAQPage'],
    imageAltPattern: '[Brand] [volume] syringe with [gauge]G needle, sterile',
    croNotes: '214 products behind this page, the deepest assortment briefed. Filtering by volume and gauge is the primary UX need; the SERP is retail-heavy so bulk pricing is the differentiator.',
    priority: 'P1',
    implementationStatus: 'complete',
    ahrefsResearchDate: '2026-09-02',
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
