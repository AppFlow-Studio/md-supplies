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
  /** Intrinsic pixel width of the logo file — set together with logoFile so the
      browser can reserve the right aspect ratio before load (no CLS). */
  logoWidth?: number
  /** Intrinsic pixel height of the logo file. */
  logoHeight?: number
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
  { name: '3M', slug: '3m', logoFile: '3m.svg', logoWidth: 300, logoHeight: 158, homepage: true },
  { name: 'Acon Laboratories', slug: 'acon-laboratories', logoFile: 'acon-laboratories.png', logoWidth: 1238, logoHeight: 256 },
  { name: 'Accutest', slug: 'accutest', logoFile: 'accutest.webp', logoWidth: 326, logoHeight: 150 },
  { name: 'AD Surgical', slug: 'ad-surgical', logoFile: 'ad-surgical.webp', logoWidth: 580, logoHeight: 158, partnerSlug: 'ad-surgical' },
  { name: 'ADC / American Diagnostic Corp.', slug: 'adc', logoFile: 'adc.svg', logoWidth: 252, logoHeight: 80, homepage: true },
  { name: 'Advanced Orthopaedics', slug: 'advanced-orthopaedics', logoFile: 'advanced-orthopaedics.png', logoWidth: 2615, logoHeight: 1446, homepage: true },
  { name: 'Airgo', slug: 'airgo', logoFile: 'airgo.webp', logoWidth: 500, logoHeight: 213 },
  { name: 'AirLife', slug: 'airlife', logoFile: 'airlife.svg', logoWidth: 538, logoHeight: 209, homepage: true },
  { name: 'AmeriDerm', slug: 'ameriderm', logoFile: 'ameriderm.avif', logoWidth: 128, logoHeight: 64 },
  { name: 'Ammex', slug: 'ammex', logoFile: 'ammex.png', logoWidth: 300, logoHeight: 124 },
  { name: 'Amsino', slug: 'amsino', logoFile: 'amsino.png', logoWidth: 241, logoHeight: 92, homepage: true },
  { name: 'Ansell', slug: 'ansell', logoFile: 'ansell.svg', logoWidth: 446, logoHeight: 138, homepage: true },
  { name: 'Arkray', slug: 'arkray', logoFile: 'arkray.webp', logoWidth: 206, logoHeight: 77 },
  { name: 'Aspen Surgical', slug: 'aspen-surgical', logoFile: 'aspen-surgical.svg', logoWidth: 333, logoHeight: 43 },
  { name: 'Bari+Max', slug: 'bari-max', logoFile: 'bari-max.png', logoWidth: 225, logoHeight: 225 },
  { name: 'BD', slug: 'bd', logoFile: 'bd.svg', logoWidth: 38, logoHeight: 15, homepage: true },
  { name: 'Bellavita', slug: 'bellavita', logoFile: 'bellavita.png', logoWidth: 1265, logoHeight: 517 },
  { name: 'Bionix', slug: 'bionix', logoFile: 'bionix.svg', logoWidth: 387, logoHeight: 92 },
  { name: 'Bird & Cronin', slug: 'bird-cronin', logoFile: 'bird-cronin.png', logoWidth: 281, logoHeight: 120 },
  { name: 'Busse Hospital Disposables', slug: 'busse-hospital-disposables', logoFile: 'busse-hospital-disposables.png', logoWidth: 300, logoHeight: 113 },
  { name: 'Cardinal Health', slug: 'cardinal-health', logoFile: 'cardinal-health.svg', logoWidth: 152, logoHeight: 56, homepage: true },
  { name: 'Chembio Diagnostics', slug: 'chembio-diagnostics', logoFile: 'chembio-diagnostics.png', logoWidth: 667, logoHeight: 160 },
  { name: 'CLIAwaived', slug: 'cliawaived', logoFile: 'cliawaived.png', logoWidth: 225, logoHeight: 225 },
  { name: 'Clorox', slug: 'clorox', logoFile: 'clorox.svg', logoWidth: 240, logoHeight: 28 },
  { name: 'CorDx', slug: 'cordx', logoFile: 'cordx.png', logoWidth: 2295, logoHeight: 654, partnerSlug: 'cordx' },
  { name: 'Dawn Mist', slug: 'dawn-mist', logoFile: 'dawn-mist.avif', logoWidth: 128, logoHeight: 64, partnerSlug: 'dawn-mist' },
  { name: 'Defend', slug: 'defend', logoFile: 'defend.jpg', logoWidth: 1333, logoHeight: 251 },
  { name: 'DeVilbiss', slug: 'devilbiss', logoFile: 'devilbiss.avif', logoWidth: 200, logoHeight: 129, homepage: true },
  { name: 'Drive Medical', slug: 'drive-medical', logoFile: 'drive-medical.svg', logoWidth: 431, logoHeight: 164, partnerSlug: 'drive-medical', homepage: true },
  { name: 'Dukal', slug: 'dukal', logoFile: 'dukal.svg', logoWidth: 1486, logoHeight: 302, partnerSlug: 'dukal', homepage: true },
  { name: 'Dynarex', slug: 'dynarex', logoFile: 'dynarex.png', logoWidth: 270, logoHeight: 90, partnerSlug: 'dynarex', homepage: true },
  { name: 'Embecta', slug: 'embecta', logoFile: 'embecta.png', logoWidth: 144, logoHeight: 57 },
  { name: 'Everest & Jennings', slug: 'everest-jennings', logoFile: 'everest-jennings.png', logoWidth: 600, logoHeight: 200 },
  { name: 'Exel', slug: 'exel', logoFile: 'exel.webp', logoWidth: 300, logoHeight: 100, homepage: true },
  { name: 'Fearless Tattoo', slug: 'fearless-tattoo', logoFile: 'fearless-tattoo.avif', logoWidth: 124, logoHeight: 80 },
  { name: 'Feather', slug: 'feather', logoFile: 'feather.webp', logoWidth: 1500, logoHeight: 495 },
  { name: 'First Glove', slug: 'first-glove', logoFile: 'first-glove.webp', logoWidth: 260, logoHeight: 20 },
  { name: 'FlowFlex', slug: 'flowflex', logoFile: 'flowflex.png', logoWidth: 255, logoHeight: 55 },
  { name: 'Gendron', slug: 'gendron', logoFile: 'gendron.webp', logoWidth: 340, logoHeight: 90 },
  { name: 'GenBody', slug: 'genbody', logoFile: 'genbody.png', logoWidth: 308, logoHeight: 60 },
  { name: 'Graham Field', slug: 'graham-field', logoFile: 'graham-field.svg', logoWidth: 558, logoHeight: 144, partnerSlug: 'graham-field', homepage: true },
  { name: 'Graham Medical', slug: 'graham-medical', logoFile: 'graham-medical.jpg', logoWidth: 507, logoHeight: 120 },
  { name: 'Grafco', slug: 'grafco', logoFile: 'grafco.svg', logoWidth: 84, logoHeight: 32, homepage: true },
  { name: 'Grifols', slug: 'grifols', logoFile: 'grifols.svg', logoWidth: 86, logoHeight: 19 },
  { name: 'Halyard / O&M Halyard', slug: 'halyard', logoFile: 'halyard.png', logoWidth: 169, logoHeight: 93, homepage: true },
  { name: 'HTL-STREFA', slug: 'htl-strefa', logoFile: 'htl-strefa.webp', logoWidth: 402, logoHeight: 153 },
  { name: 'ICU Medical', slug: 'icu-medical', logoFile: 'icu-medical.png', logoWidth: 400, logoHeight: 400, homepage: true },
  { name: 'Innovative Healthcare', slug: 'innovative-healthcare', logoFile: 'innovative-healthcare.webp', logoWidth: 300, logoHeight: 122 },
  { name: 'John Bunn', slug: 'john-bunn', logoFile: 'john-bunn.avif', logoWidth: 128, logoHeight: 64 },
  { name: 'Kadara Medical', slug: 'kadara', logoFile: 'kadara.avif', logoWidth: 448, logoHeight: 105, partnerSlug: 'kadara' },
  { name: 'Kemp USA', slug: 'kemp-usa', logoFile: 'kemp-usa.svg', logoWidth: 500, logoHeight: 251, partnerSlug: 'kemp-usa' },
  { name: 'Kinsman Enterprises', slug: 'kinsman-enterprises', logoFile: 'kinsman-enterprises.png', logoWidth: 2800, logoHeight: 1500 },
  { name: 'Laerdal', slug: 'laerdal', logoFile: 'laerdal.svg', logoWidth: 88, logoHeight: 48, homepage: true },
  { name: 'LifeSign', slug: 'lifesign', logoFile: 'lifesign.png', logoWidth: 267, logoHeight: 110 },
  { name: 'Lumex', slug: 'lumex', logoFile: 'lumex.svg', logoWidth: 109, logoHeight: 85, partnerSlug: 'lumex', homepage: true },
  { name: 'Medical Action Industries', slug: 'medical-action-industries', logoFile: 'medical-action-industries.jpg', logoWidth: 485, logoHeight: 110 },
  { name: 'Medegen Medical Products', slug: 'medegen-medical-products', logoFile: 'medegen-medical-products.jpg', logoWidth: 297, logoHeight: 103 },
  { name: 'Medgluv', slug: 'medgluv', logoFile: 'medgluv.png', logoWidth: 200, logoHeight: 51 },
  { name: 'Medicom', slug: 'medicom', logoFile: 'medicom.svg', logoWidth: 155, logoHeight: 31 },
  { name: 'Medi-Cut', slug: 'medi-cut', logoFile: 'medi-cut.png', logoWidth: 241, logoHeight: 62 },
  { name: 'MediPurpose', slug: 'medipurpose', logoFile: 'medipurpose.jpeg', logoWidth: 200, logoHeight: 188 },
  { name: 'MediVena', slug: 'medivena', logoFile: 'medivena.webp', logoWidth: 500, logoHeight: 180 },
  { name: 'MedPride', slug: 'medpride', logoFile: 'medpride.png', logoWidth: 141, logoHeight: 109, homepage: true },
  { name: 'Medtronic', slug: 'medtronic', logoFile: 'medtronic.svg', logoWidth: 34, logoHeight: 6 },
  { name: 'Metrex', slug: 'metrex', logoFile: 'metrex.svg', logoWidth: 148, logoHeight: 45 },
  { name: 'Molnlycke', slug: 'molnlycke', logoFile: 'molnlycke.png', logoWidth: 2222, logoHeight: 1250, homepage: true },
  { name: 'Myco Medical', slug: 'myco-medical', logoFile: 'myco-medical.svg', logoWidth: 521, logoHeight: 272 },
  { name: 'New World Imports', slug: 'new-world-imports', logoFile: 'new-world-imports.jpg', logoWidth: 1102, logoHeight: 235 },
  { name: 'Omni International', slug: 'omni-international', logoFile: 'omni-international.png', logoWidth: 440, logoHeight: 52 },
  { name: 'Omron Healthcare', slug: 'omron-healthcare', logoFile: 'omron-healthcare.svg', logoWidth: 323, logoHeight: 63, homepage: true },
  { name: 'OraSure', slug: 'orasure', logoFile: 'orasure.png', logoWidth: 250, logoHeight: 75 },
  { name: 'OSOM', slug: 'osom', logoFile: 'osom.svg', logoWidth: 312, logoHeight: 38 },
  { name: 'Owen Mumford', slug: 'owen-mumford', logoFile: 'owen-mumford.svg', logoWidth: 432, logoHeight: 73 },
  { name: 'PDI', slug: 'pdi', logoFile: 'pdi.webp', logoWidth: 799, logoHeight: 364, homepage: true },
  { name: 'Philips', slug: 'philips', logoFile: 'philips.svg', logoWidth: 786, logoHeight: 1001, homepage: true },
  { name: 'Quidel', slug: 'quidel', logoFile: 'quidel.svg', logoWidth: 69, logoHeight: 9 },
  { name: 'Resp-O2', slug: 'resp-o2', logoFile: 'resp-o2.jpeg', logoWidth: 308, logoHeight: 164 },
  { name: 'Rx Systems', slug: 'rx-systems', logoFile: 'rx-systems.png', logoWidth: 223, logoHeight: 56 },
  { name: 'Safetec', slug: 'safetec', logoFile: 'safetec.webp', logoWidth: 500, logoHeight: 134 },
  { name: 'Sempermed USA', slug: 'sempermed-usa', logoFile: 'sempermed-usa.png', logoWidth: 417, logoHeight: 121, homepage: true },
  { name: 'Siemens', slug: 'siemens', logoFile: 'siemens.svg', logoWidth: 576, logoHeight: 144, homepage: true },
  { name: 'SS Medical Products', slug: 'ss-medical-products', logoFile: 'ss-medical-products.png', logoWidth: 225, logoHeight: 225 },
  { name: 'Stat Medical Devices', slug: 'stat-medical-devices', logoFile: 'stat-medical-devices.jpeg', logoWidth: 224, logoHeight: 224 },
  { name: 'TIDI Products', slug: 'tidi-products', logoFile: 'tidi-products.svg', logoWidth: 251, logoHeight: 133 },
  { name: 'Tech-Med', slug: 'tech-med', logoFile: 'tech-med.jpeg', logoWidth: 225, logoHeight: 225 },
  { name: 'Terumo', slug: 'terumo', logoFile: 'terumo.svg', logoWidth: 213, logoHeight: 37, homepage: true },
  // Glenshaw is a Dynarex sub-brand; reuses the Dynarex logo by request (no standalone mark exists).
  { name: 'The Glenshaw Collection', slug: 'the-glenshaw-collection', logoFile: 'dynarex.png', logoWidth: 270, logoHeight: 90 },
  { name: 'Tillotson', slug: 'tillotson', logoFile: 'tillotson.png', logoWidth: 323, logoHeight: 156 },
  { name: 'TLC DME', slug: 'tlc-dme', logoFile: 'tlc-dme.png', logoWidth: 81, logoHeight: 90 },
  { name: 'Trocar Supplies', slug: 'trocar-supplies', logoFile: 'trocar-supplies.avif', logoWidth: 410, logoHeight: 195, homepage: true },
  { name: 'TrueCare Biomedix', slug: 'truecare-biomedix', logoFile: 'truecare.svg', logoWidth: 204, logoHeight: 44, partnerSlug: 'truecare' },
  { name: 'UltiMed', slug: 'ultimed', logoFile: 'ultimed.png', logoWidth: 600, logoHeight: 224 },
  { name: 'UNIFY', slug: 'unify', logoFile: 'unify.svg', logoWidth: 378, logoHeight: 180 },
  { name: 'Unipack', slug: 'unipack', logoFile: 'unipack.jpeg', logoWidth: 316, logoHeight: 159 },
  { name: 'Ventyv', slug: 'ventyv', logoFile: 'ventyv.webp', logoWidth: 300, logoHeight: 133 },
  { name: 'WeCare', slug: 'wecare', logoFile: 'wecare.png', logoWidth: 245, logoHeight: 148 },
  { name: 'Welch Allyn', slug: 'welch-allyn', logoFile: 'welch-allyn.svg', logoWidth: 188, logoHeight: 39, homepage: true },
  { name: 'Zoll', slug: 'zoll', logoFile: 'zoll.png', logoWidth: 1034, logoHeight: 300, homepage: true },
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

/**
 * The full brand list in approved alphabetical order (§6.2). Sorting here
 * guarantees correct order regardless of hand-edited array position (e.g. the
 * "Accutest" / "Acon Laboratories" pair) and is the single source used by the
 * brands page.
 */
export function getSortedBrands(): Brand[] {
  return [...BRANDS].sort((a, b) =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }),
  )
}
