// Curated per-category placeholder images uploaded to BunnyCDN (one flat
// `categories/` folder, .jpeg — see lib/bunnycdn.ts for the proxy rationale).
// Keyed by the `placeholderSlug` values in lib/category-nav.ts. Category and
// subcategory banners and per-category product placeholders all resolve to
// the same file until dedicated banner photography is uploaded.

export type CategoryImageEntry = {
  file: string
  alt: string
}

export const CATEGORY_IMAGE_FALLBACK: CategoryImageEntry = {
  file: 'medical-supplies-placeholder.jpeg',
  alt: 'Assorted medical supplies',
}

export const CATEGORY_IMAGE_CONFIG: Record<string, CategoryImageEntry> = {
  'gloves':                  { file: 'gloves-placeholder.jpeg',                  alt: 'Disposable exam gloves' },
  'wound-care':              { file: 'wound-care-placeholder.jpeg',              alt: 'Wound care dressings and bandages' },
  'needles-syringes':        { file: 'needles-syringes-placeholder.jpeg',        alt: 'Needles and syringes' },
  'surgical-sutures':        { file: 'surgical-sutures-placeholder.jpeg',        alt: 'Surgical sutures' },
  'testing':                 { file: 'testing-placeholder.jpeg',                 alt: 'Testing and screening supplies' },
  'exam-room':               { file: 'exam-room-placeholder.jpeg',               alt: 'Exam room equipment and supplies' },
  'respiratory':             { file: 'respiratory-placeholder.jpeg',             alt: 'Respiratory care supplies' },
  'mobility':                { file: 'mobility-placeholder.jpeg',                alt: 'Mobility aids and equipment' },
  'patient-therapy-rehab':   { file: 'patient-therapy-rehab-placeholder.jpeg',   alt: 'Patient therapy and rehab equipment' },
  'surgery-procedure':       { file: 'surgery-procedure-placeholder.jpeg',       alt: 'Surgery and procedure instruments' },
  'apparel':                 { file: 'apparel-placeholder.jpeg',                 alt: 'Medical apparel and scrubs' },
  'hygiene':                 { file: 'hygiene-placeholder.jpeg',                 alt: 'Hygiene products' },
  'disinfectants':           { file: 'disinfectants-placeholder.jpeg',           alt: 'Disinfectants and cleaning solutions' },
  'home-care':               { file: 'home-care-placeholder.jpeg',               alt: 'Home care supplies' },
  'emergency-supplies':      { file: 'emergency-supplies-placeholder.jpeg',      alt: 'Emergency and first aid supplies' },
  'incontinence':            { file: 'incontinence-placeholder.jpeg',            alt: 'Incontinence care products' },
  'iv-therapy':              { file: 'iv-therapy-placeholder.jpeg',              alt: 'IV therapy supplies' },
  'urology-ostomy':          { file: 'urology-ostomy-placeholder.jpeg',          alt: 'Urology and ostomy supplies' },
  'sterilization':           { file: 'sterilization-placeholder.jpeg',           alt: 'Sterilization equipment and supplies' },
  'dental':                  { file: 'dental-placeholder.jpeg',                  alt: 'Dental supplies' },
  'bariatric':               { file: 'bariatric-placeholder.jpeg',               alt: 'Bariatric equipment' },
  'face-masks':              { file: 'face-masks-placeholder.jpeg',              alt: 'Face masks and respirators' },
  'housekeeping-janitorial': { file: 'housekeeping-janitorial-placeholder.jpeg', alt: 'Housekeeping and janitorial supplies' },
  'pharmacy-products':       { file: 'pharmacy-products-placeholder.jpeg',       alt: 'Pharmacy products' },
  'room-furniture':          { file: 'room-furniture-placeholder.jpeg',          alt: 'Medical room furniture' },
}
