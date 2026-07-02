// Single source of truth for category hero banner assets.
// `file` is the BunnyCDN filename relative to the categories/ zone path.
// When Deepika delivers approved assets, update only the `file` value for each entry.
// `alt` is used in the <img> alt attribute — describes the category, not the image.

export type CategoryImageEntry = {
  file: string
  alt: string
}

export const CATEGORY_IMAGE_CONFIG: Record<string, CategoryImageEntry> = {
  'gloves':                    { file: 'gloves-placeholder.jpeg',                    alt: 'Medical gloves category' },
  'wound-care':                { file: 'wound-care-placeholder.jpeg',                alt: 'Wound care supplies category' },
  'needles-syringes':          { file: 'needles-syringes-placeholder.jpeg',          alt: 'Needles and syringes category' },
  'surgical-sutures':          { file: 'surgical-sutures-placeholder.jpeg',          alt: 'Surgical sutures category' },
  'testing':                   { file: 'testing-placeholder.jpeg',                   alt: 'Medical testing and screening category' },
  'exam-room':                 { file: 'exam-room-placeholder.jpeg',                 alt: 'Exam room supplies category' },
  'respiratory':               { file: 'respiratory-placeholder.jpeg',               alt: 'Respiratory care products category' },
  'mobility':                  { file: 'mobility-placeholder.jpeg',                  alt: 'Mobility aids and equipment category' },
  'patient-therapy-rehab':     { file: 'patient-therapy-rehab-placeholder.jpeg',     alt: 'Patient therapy and rehabilitation category' },
  'surgery-procedure':         { file: 'surgery-procedure-placeholder.jpeg',         alt: 'Surgery and procedure supplies category' },
  'apparel':                   { file: 'apparel-placeholder.jpeg',                   alt: 'Medical apparel and protective wear category' },
  'hygiene':                   { file: 'hygiene-placeholder.jpeg',                   alt: 'Hygiene and personal care products category' },
  'disinfectants':             { file: 'disinfectants-placeholder.jpeg',             alt: 'Disinfectants and cleaning products category' },
  'home-care':                 { file: 'home-care-placeholder.jpeg',                 alt: 'Home care and health monitoring category' },
  'emergency-supplies':        { file: 'emergency-supplies-placeholder.jpeg',        alt: 'Emergency medical supplies category' },
  'incontinence':              { file: 'incontinence-placeholder.jpeg',              alt: 'Incontinence care products category' },
  'iv-therapy':                { file: 'iv-therapy-placeholder.jpeg',                alt: 'IV therapy and infusion supplies category' },
  'urology-ostomy':            { file: 'urology-ostomy-placeholder.jpeg',            alt: 'Urology and ostomy care category' },
  'sterilization':             { file: 'sterilization-placeholder.jpeg',             alt: 'Sterilization and infection control category' },
  'dental':                    { file: 'dental-placeholder.jpeg',                    alt: 'Dental supplies and instruments category' },
  'housekeeping-janitorial':   { file: 'housekeeping-janitorial-placeholder.jpeg',   alt: 'Housekeeping and janitorial supplies category' },
  'bariatric':                 { file: 'bariatric-placeholder.jpeg',                 alt: 'Bariatric care products category' },
  'room-furniture':            { file: 'room-furniture-placeholder.jpeg',            alt: 'Medical room furniture and fixtures category' },
  'face-masks':                { file: 'face-masks-placeholder.jpeg',                alt: 'Face masks and respiratory protection category' },
  'pharmacy-products':         { file: 'pharmacy-products-placeholder.jpeg',         alt: 'Pharmacy and medication management category' },
}

export const CATEGORY_IMAGE_FALLBACK: CategoryImageEntry = {
  file: 'medical-supplies-placeholder.jpeg',
  alt: 'Medical supplies category',
}
