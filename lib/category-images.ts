
// Curated per-category imagery lives in one flat `categories/` folder on the
// md-supplies BunnyCDN storage zone (verified directly against the storage API):
// zone-root-relative `.jpeg` files named `${placeholderSlug}-placeholder.jpeg`.
// There is no separate banner set yet, so category/subcategory banners and the
// per-category product placeholder all resolve to the same file until dedicated
// banner photography is uploaded. lib/bunnycdn.ts turns `file` into a proxy path.

// Single source of truth for category hero banner assets.
// `file` is the BunnyCDN filename relative to the categories/ zone path.
// When Deepika delivers approved assets, update only the `file` value for each entry.
// `alt` is used in the <img> alt attribute — describes the category, not the image.

// Curated per-category placeholder images uploaded to BunnyCDN (one flat
// `categories/` folder, .jpeg — see lib/bunnycdn.ts for the proxy rationale).
// Keyed by the `placeholderSlug` values in lib/category-nav.ts. Category and
// subcategory banners and per-category product placeholders all resolve to
// the same file until dedicated banner photography is uploaded.

export type CategoryImageEntry = {
  /** Filename within the `categories/` folder on BunnyCDN storage. */
  file: string
  /** Descriptive alt text for the category hero/banner image. */
  alt: string
  /**
   * CSS object-position for the hero's object-cover crop.
   *
   * Every delivered asset is 4:3 (measured 2026-08-12: 1200x896 or 2400x1792,
   * ar 1.34 on all 25). The hero crops that to a much wider box, so the
   * vertical anchor decides what survives. These are product-on-white studio
   * shots with the subject sitting LOW in frame — on mobility, the wheelchairs
   * and walkers occupy roughly 44%-79% of the frame height; on room-furniture
   * the exam table and stool occupy roughly 39%-87%. A default `center`
   * (50%) anchor slices the wheels and legs off both.
   *
   * DEFAULT_HERO_FOCAL below is the measured compromise. Per-route overrides
   * go here when an asset needs one.
   */
  focalPosition?: string
}

/**
 * Vertical anchor for the hero crop, measured from the delivered assets rather
 * than guessed: the subject's centre of mass sits at ~61% (mobility) and ~63%
 * (room-furniture) of frame height, and the remaining assets in the set share
 * the same studio framing. 58% keeps the product bases in frame at the hero's
 * widest crop without pushing the tops out.
 */
export const DEFAULT_HERO_FOCAL = 'center 58%'

/** Used when a handle matches no roadmap category (or the category has no entry). */
export const CATEGORY_IMAGE_FALLBACK: CategoryImageEntry = {
  file: 'medical-supplies-placeholder.jpeg',
  alt: 'Assorted medical supplies',
}

/**
 * The Surgery & Procedure artwork file, referenced by name rather than
 * duplicated as a string literal: /category/trocars-trocar-kits deliberately
 * REUSES this exact asset (the Trocar Shopify collection carries no image of
 * its own — verified against the Storefront API on 2026-08-20, and no approved
 * Trocar photography exists in the repo or the CDN zone). Sharing the constant
 * means an approved Trocar asset later is a one-line change in one place, and
 * the two entries can never silently drift onto different files.
 */
const SURGERY_PROCEDURE_IMAGE_FILE = 'surgery-procedure-placeholder.jpeg'

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
  'surgery-procedure':       { file: SURGERY_PROCEDURE_IMAGE_FILE,               alt: 'Surgery and procedure instruments' },
  // Featured subcategory (lib/category-tree.ts FEATURED_SUBCATEGORIES). Keyed
  // on the collection handle so lib/bunnycdn.ts resolves it directly instead of
  // inheriting the Surgery & Procedure entry — same artwork file, but truthful
  // alt text for the page it actually labels.
  'trocars-trocar-kits':     { file: SURGERY_PROCEDURE_IMAGE_FILE,               alt: 'Trocars and trocar kits' },
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
