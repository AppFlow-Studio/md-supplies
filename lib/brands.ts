// Canonical approved-brand registry (closeout §6).
//
// Single source of truth for the homepage "Trusted Brands We Carry" strip (§6.1)
// and the alphabetical brand page (§6.2). Forbidden brands (McKesson, Medline,
// Vive / V Health, and any unconfirmed / removed-category vendor) are intentionally
// absent — do not re-add them (§13.1).
//
// Logos are served from BunnyCDN via the same-origin proxy (app/api/bunny/[...path]).
// A `logo` is set ONLY for brands whose logo file has been uploaded AND visually
// verified — never a guessed/placeholder asset. Brands without a verified logo render
// as a clean text label (no broken image).
//
// `partnerSlug` is set ONLY when a real /partners/<slug> destination exists. Brands
// without a valid destination render with no link (§6.2).

export interface Brand {
  /** Display name, exactly as approved (§6.2). */
  name: string
  /** Stable kebab-case identifier. */
  slug: string
  /** CDN logo filename under brands/ — present only when verified & uploaded. */
  logoFile?: string
  /** Existing /partners/<slug> page, when one exists. */
  partnerSlug?: string
  /** Part of the approved 30-brand homepage set (§6.1). */
  homepage?: boolean
}

const BRAND_LOGO_PREFIX = '/api/bunny/brands'

/** Full proxy URL for a brand logo file, or undefined when there is no verified logo. */
export function brandLogoUrl(brand: Pick<Brand, 'logoFile'>): string | undefined {
  return brand.logoFile ? `${BRAND_LOGO_PREFIX}/${brand.logoFile}` : undefined
}

/** Valid destination for a brand, or undefined when none exists (render without a link). */
export function brandHref(brand: Pick<Brand, 'partnerSlug'>): string | undefined {
  return brand.partnerSlug ? `/partners/${brand.partnerSlug}` : undefined
}

// Full approved alphabetical list (§6.2). Keep sorted by `name`.
export const BRANDS: Brand[] = [
  { name: '3M', slug: '3m', logoFile: '3m.svg', homepage: true },
  { name: 'Acon Laboratories', slug: 'acon-laboratories', logoFile: 'acon-laboratories.png' },
  { name: 'Accutest', slug: 'accutest', logoFile: 'accutest.webp' },
  { name: 'AD Surgical', slug: 'ad-surgical', logoFile: 'ad-surgical.webp', partnerSlug: 'ad-surgical' },
  { name: 'ADC / American Diagnostic Corp.', slug: 'adc', logoFile: 'adc.svg', homepage: true },
  { name: 'Advanced Orthopaedics', slug: 'advanced-orthopaedics', logoFile: 'advanced-orthopaedics.png', homepage: true },
  { name: 'Airgo', slug: 'airgo', logoFile: 'airgo.webp' },
  { name: 'AirLife', slug: 'airlife', logoFile: 'airlife.svg', homepage: true },
  { name: 'AmeriDerm', slug: 'ameriderm', logoFile: 'ameriderm.avif' },
  { name: 'Ammex', slug: 'ammex', logoFile: 'ammex.png' },
  { name: 'Amsino', slug: 'amsino', logoFile: 'amsino.png', homepage: true },
  { name: 'Ansell', slug: 'ansell', logoFile: 'ansell.svg', homepage: true },
  { name: 'Arkray', slug: 'arkray', logoFile: 'arkray.webp' },
  { name: 'Aspen Surgical', slug: 'aspen-surgical', logoFile: 'aspen-surgical.svg' },
  { name: 'Bari+Max', slug: 'bari-max', logoFile: 'bari-max.png' },
  { name: 'BD', slug: 'bd', logoFile: 'bd.svg', homepage: true },
  { name: 'Bellavita', slug: 'bellavita', logoFile: 'bellavita.png' },
  { name: 'Bionix', slug: 'bionix', logoFile: 'bionix.svg' },
  { name: 'Bird & Cronin', slug: 'bird-cronin', logoFile: 'bird-cronin.png' },
  { name: 'Busse Hospital Disposables', slug: 'busse-hospital-disposables', logoFile: 'busse-hospital-disposables.png' },
  { name: 'Cardinal Health', slug: 'cardinal-health', logoFile: 'cardinal-health.svg', homepage: true },
  { name: 'Chembio Diagnostics', slug: 'chembio-diagnostics', logoFile: 'chembio-diagnostics.png' },
  { name: 'CLIAwaived', slug: 'cliawaived', logoFile: 'cliawaived.png' },
  { name: 'Clorox', slug: 'clorox', logoFile: 'clorox.svg' },
  { name: 'CorDx', slug: 'cordx', logoFile: 'cordx.png', partnerSlug: 'cordx' },
  { name: 'Dawn Mist', slug: 'dawn-mist', logoFile: 'dawn-mist.avif', partnerSlug: 'dawn-mist' },
  { name: 'Defend', slug: 'defend', logoFile: 'defend.jpg' },
  { name: 'DeVilbiss', slug: 'devilbiss', logoFile: 'devilbiss.avif', homepage: true },
  { name: 'Drive Medical', slug: 'drive-medical', logoFile: 'drive-medical.svg', partnerSlug: 'drive-medical', homepage: true },
  { name: 'Dukal', slug: 'dukal', logoFile: 'dukal.svg', partnerSlug: 'dukal', homepage: true },
  { name: 'Dynarex', slug: 'dynarex', logoFile: 'dynarex.png', partnerSlug: 'dynarex', homepage: true },
  { name: 'Embecta', slug: 'embecta', logoFile: 'embecta.png' },
  { name: 'Everest & Jennings', slug: 'everest-jennings', logoFile: 'everest-jennings.png' },
  { name: 'Exel', slug: 'exel', logoFile: 'exel.webp', homepage: true },
  { name: 'Fearless Tattoo', slug: 'fearless-tattoo', logoFile: 'fearless-tattoo.avif' },
  { name: 'Feather', slug: 'feather', logoFile: 'feather.webp' },
  { name: 'First Glove', slug: 'first-glove', logoFile: 'first-glove.webp' },
  { name: 'FlowFlex', slug: 'flowflex', logoFile: 'flowflex.png' },
  { name: 'Gendron', slug: 'gendron', logoFile: 'gendron.webp' },
  { name: 'GenBody', slug: 'genbody', logoFile: 'genbody.png' },
  { name: 'Graham Field', slug: 'graham-field', logoFile: 'graham-field.svg', partnerSlug: 'graham-field', homepage: true },
  { name: 'Graham Medical', slug: 'graham-medical', logoFile: 'graham-medical.jpg' },
  { name: 'Grafco', slug: 'grafco', logoFile: 'grafco.svg', homepage: true },
  { name: 'Grifols', slug: 'grifols', logoFile: 'grifols.svg' },
  { name: 'Halyard / O&M Halyard', slug: 'halyard', logoFile: 'halyard.png', homepage: true },
  { name: 'HTL-STREFA', slug: 'htl-strefa', logoFile: 'htl-strefa.webp' },
  { name: 'ICU Medical', slug: 'icu-medical', logoFile: 'icu-medical.png', homepage: true },
  { name: 'Innovative Healthcare', slug: 'innovative-healthcare', logoFile: 'innovative-healthcare.webp' },
  { name: 'John Bunn', slug: 'john-bunn', logoFile: 'john-bunn.avif' },
  { name: 'Kadara Medical', slug: 'kadara', logoFile: 'kadara.avif', partnerSlug: 'kadara' },
  { name: 'Kemp USA', slug: 'kemp-usa', logoFile: 'kemp-usa.svg', partnerSlug: 'kemp-usa' },
  { name: 'Kinsman Enterprises', slug: 'kinsman-enterprises', logoFile: 'kinsman-enterprises.png' },
  { name: 'Laerdal', slug: 'laerdal', logoFile: 'laerdal.svg', homepage: true },
  { name: 'LifeSign', slug: 'lifesign', logoFile: 'lifesign.png' },
  { name: 'Lumex', slug: 'lumex', logoFile: 'lumex.svg', partnerSlug: 'lumex', homepage: true },
  { name: 'Medical Action Industries', slug: 'medical-action-industries', logoFile: 'medical-action-industries.jpg' },
  { name: 'Medegen Medical Products', slug: 'medegen-medical-products', logoFile: 'medegen-medical-products.jpg' },
  { name: 'Medgluv', slug: 'medgluv', logoFile: 'medgluv.png' },
  { name: 'Medicom', slug: 'medicom', logoFile: 'medicom.svg' },
  { name: 'Medi-Cut', slug: 'medi-cut', logoFile: 'medi-cut.png' },
  { name: 'MediPurpose', slug: 'medipurpose', logoFile: 'medipurpose.jpeg' },
  { name: 'MediVena', slug: 'medivena', logoFile: 'medivena.webp' },
  { name: 'MedPride', slug: 'medpride', logoFile: 'medpride.png', homepage: true },
  { name: 'Medtronic', slug: 'medtronic', logoFile: 'medtronic.svg' },
  { name: 'Metrex', slug: 'metrex', logoFile: 'metrex.svg' },
  { name: 'Molnlycke', slug: 'molnlycke', logoFile: 'molnlycke.png', homepage: true },
  { name: 'Myco Medical', slug: 'myco-medical', logoFile: 'myco-medical.svg' },
  { name: 'New World Imports', slug: 'new-world-imports', logoFile: 'new-world-imports.jpg' },
  { name: 'Omni International', slug: 'omni-international', logoFile: 'omni-international.png' },
  { name: 'Omron Healthcare', slug: 'omron-healthcare', logoFile: 'omron-healthcare.svg', homepage: true },
  { name: 'OraSure', slug: 'orasure', logoFile: 'orasure.png' },
  { name: 'OSOM', slug: 'osom', logoFile: 'osom.svg' },
  { name: 'Owen Mumford', slug: 'owen-mumford', logoFile: 'owen-mumford.svg' },
  { name: 'PDI', slug: 'pdi', logoFile: 'pdi.webp', homepage: true },
  { name: 'Philips', slug: 'philips', logoFile: 'philips.svg', homepage: true },
  { name: 'Quidel', slug: 'quidel', logoFile: 'quidel.svg' },
  { name: 'Resp-O2', slug: 'resp-o2', logoFile: 'resp-o2.jpeg' },
  { name: 'Rx Systems', slug: 'rx-systems', logoFile: 'rx-systems.png' },
  { name: 'Safetec', slug: 'safetec', logoFile: 'safetec.webp' },
  { name: 'Sempermed USA', slug: 'sempermed-usa', logoFile: 'sempermed-usa.png', homepage: true },
  { name: 'Siemens', slug: 'siemens', logoFile: 'siemens.svg', homepage: true },
  { name: 'SS Medical Products', slug: 'ss-medical-products', logoFile: 'ss-medical-products.png' },
  { name: 'Stat Medical Devices', slug: 'stat-medical-devices', logoFile: 'stat-medical-devices.jpeg' },
  { name: 'TIDI Products', slug: 'tidi-products', logoFile: 'tidi-products.svg' },
  { name: 'Tech-Med', slug: 'tech-med', logoFile: 'tech-med.jpeg' },
  { name: 'Terumo', slug: 'terumo', logoFile: 'terumo.svg', homepage: true },
  // Glenshaw is a Dynarex sub-brand; reuses the Dynarex logo by request (no standalone mark exists).
  { name: 'The Glenshaw Collection', slug: 'the-glenshaw-collection', logoFile: 'dynarex.png' },
  { name: 'Tillotson', slug: 'tillotson', logoFile: 'tillotson.png' },
  { name: 'TLC DME', slug: 'tlc-dme', logoFile: 'tlc-dme.png' },
  { name: 'Trocar Supplies', slug: 'trocar-supplies', logoFile: 'trocar-supplies.avif', homepage: true },
  { name: 'TrueCare Biomedix', slug: 'truecare-biomedix', logoFile: 'truecare.svg', partnerSlug: 'truecare' },
  { name: 'UltiMed', slug: 'ultimed', logoFile: 'ultimed.png' },
  { name: 'UNIFY', slug: 'unify', logoFile: 'unify.svg' },
  { name: 'Unipack', slug: 'unipack', logoFile: 'unipack.jpeg' },
  { name: 'Ventyv', slug: 'ventyv', logoFile: 'ventyv.webp' },
  { name: 'WeCare', slug: 'wecare', logoFile: 'wecare.png' },
  { name: 'Welch Allyn', slug: 'welch-allyn', logoFile: 'welch-allyn.svg', homepage: true },
  { name: 'Zoll', slug: 'zoll', logoFile: 'zoll.png', homepage: true },
]

// Approved homepage set (§6.1), in the spec's order. Derived from BRANDS so names
// and logos never drift. Homepage shows brands that have a verified logo first.
const HOMEPAGE_ORDER = [
  'dynarex', 'dukal', 'graham-field', 'drive-medical', 'lumex', 'grafco', 'ansell',
  'cardinal-health', 'exel', 'bd', 'medpride', 'halyard', 'sempermed-usa', 'molnlycke',
  'laerdal', 'advanced-orthopaedics', 'trocar-supplies', 'amsino', 'terumo', 'icu-medical',
  'welch-allyn', 'omron-healthcare', '3m', 'pdi', 'siemens', 'airlife', 'adc', 'devilbiss',
  'philips', 'zoll',
]

const bySlug = new Map(BRANDS.map((b) => [b.slug, b]))

/** Approved homepage brands (§6.1), spec order. */
export const HOMEPAGE_BRANDS: Brand[] = HOMEPAGE_ORDER
  .map((slug) => bySlug.get(slug))
  .filter((b): b is Brand => Boolean(b))

/** Approved homepage brands that have a verified CDN logo — for the trust strip. */
export const HOMEPAGE_BRANDS_WITH_LOGO: Brand[] = HOMEPAGE_BRANDS.filter((b) => b.logoFile)
