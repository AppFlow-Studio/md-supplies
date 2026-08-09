import { ROUTES } from '@/lib/routes'

/**
 * Per-industry landing content.
 *
 * Every supported industry gets a DISTINCT buying guide and a DISTINCT set of
 * category links. The whole point of the industry-page exercise is to avoid
 * twelve pages that differ only by a swapped noun — Google treats those as
 * doorway pages and buyers get nothing useful from them.
 *
 * Category links are curated against categories that genuinely carry products
 * for that buyer; they are ordinary crawlable routes, and each is a real L1 in
 * the category registry. Nothing here asserts stock levels, shipping speed,
 * certification or clinical advice.
 */

type Link = { label: string; href: string }
type GuideSection = { heading: string; body: string }

const CATEGORY_LINKS: Record<string, Link[]> = {
  'urgent-care': [
    { label: 'Wound Care', href: ROUTES.category('wound-care') },
    { label: 'Needles & Syringes', href: ROUTES.category('needles-syringes') },
    { label: 'Gloves', href: ROUTES.category('gloves') },
    { label: 'Testing & Screening', href: ROUTES.category('testing-screening') },
    { label: 'Exam Room', href: ROUTES.category('exam-room') },
    { label: 'Emergency Supplies', href: ROUTES.category('emergency-supplies') },
  ],
  'hrt-clinics': [
    { label: 'Needles & Syringes', href: ROUTES.category('needles-syringes') },
    { label: 'Surgery & Procedure', href: ROUTES.category('trocars-trocar-kits') },
    { label: 'Gloves', href: ROUTES.category('gloves') },
    { label: 'Exam Room', href: ROUTES.category('exam-room') },
    { label: 'Sterilization', href: ROUTES.category('sterilization') },
  ],
  'home-health': [
    { label: 'Home Care', href: ROUTES.category('home-care') },
    { label: 'Incontinence', href: ROUTES.category('incontinence') },
    { label: 'Mobility', href: ROUTES.category('mobility') },
    { label: 'Wound Care', href: ROUTES.category('wound-care') },
    { label: 'Bathroom Safety', href: ROUTES.category('bathroom') },
    { label: 'Patient Therapy & Rehab', href: ROUTES.category('patient-therapy-rehab') },
  ],
  'clinics-doctors-offices': [
    { label: 'Exam Room', href: ROUTES.category('exam-room') },
    { label: 'Gloves', href: ROUTES.category('gloves') },
    { label: 'Wound Care', href: ROUTES.category('wound-care') },
    { label: 'Testing & Screening', href: ROUTES.category('testing-screening') },
    { label: 'Needles & Syringes', href: ROUTES.category('needles-syringes') },
    { label: 'Disinfectants', href: ROUTES.category('disinfectants') },
  ],
  pharmacies: [
    { label: 'Pharmacy Products', href: ROUTES.category('pharmacy-products') },
    { label: 'Testing & Screening', href: ROUTES.category('testing-screening') },
    { label: 'Home Care', href: ROUTES.category('home-care') },
    { label: 'Gloves', href: ROUTES.category('gloves') },
  ],
}

const BUYING_GUIDES: Record<string, GuideSection[]> = {
  'urgent-care': [
    {
      heading: 'Stock for unscheduled volume, not averages',
      body: 'Urgent care demand arrives in bursts, so the items that run out first are the cheap high-turn ones — gloves, gauze, tape, suture kits and specimen collection. Buying those by the case rather than the box is usually the difference between a smooth shift and an emergency reorder.',
    },
    {
      heading: 'Match laceration supplies to the repairs you actually do',
      body: 'Suture selection follows the wounds you see most: absorbable for deep layers, non-absorbable for skin closure, and a matching needle profile. Stocking two or three sizes you use constantly beats a wide range you rarely open.',
    },
    {
      heading: 'Point-of-care testing drives throughput',
      body: 'Rapid tests decide how quickly a patient can be dispositioned. Check what each kit detects, the sample it needs, and its read time before standardising — those three attributes matter more than unit price at urgent-care volumes.',
    },
  ],
  'hrt-clinics': [
    {
      heading: 'Needle and syringe selection is the core decision',
      body: 'Hormone therapy is dominated by injection supplies, and gauge and length drive both comfort and technique. Drawing and administering frequently call for different gauges, so most clinics keep a small, deliberate matrix rather than one universal option.',
    },
    {
      heading: 'Pellet procedures need a consistent tray',
      body: 'Pellet insertion is a minor procedure with a repeatable kit: trocar, blade, drape, antiseptic, closure and dressing. Standardising that tray removes the mid-procedure surprises that come from mixed inventory.',
    },
    {
      heading: 'Some items require a prescription or licence on file',
      body: 'Part of this catalogue is prescription-restricted. Those products are marked, and checkout asks a signed-in account to have the required document on file before the order can be completed. Uploading it once covers future orders.',
    },
  ],
  'home-health': [
    {
      heading: 'Buy for the home, not the ward',
      body: 'Home health inventory travels in a car and gets used in a bedroom or bathroom. Package size, weight and how easily a family member can handle an item matter as much as clinical suitability — a case that suits a supply room is often wrong for a boot.',
    },
    {
      heading: 'Incontinence sizing beats absorbency claims',
      body: 'Fit is the main determinant of leakage and skin health. Confirm sizing against the wearer before scaling up an order, and expect absorbency needs to differ between day and overnight use.',
    },
    {
      heading: 'Mobility and bathroom safety are usually bought together',
      body: 'Discharge planning tends to pair a mobility aid with bathroom modifications — grab bars, transfer benches, raised seats. Ordering them in one go avoids a second delivery in the week a patient is least able to wait.',
    },
  ],
  'clinics-doctors-offices': [
    {
      heading: 'Standardise the fast movers first',
      body: 'Most of a practice\'s spend sits in a short list of consumables: gloves, exam paper, disinfectant, gauze and specimen supplies. Standardising those on one specification simplifies reordering and makes usage predictable enough to buy in volume.',
    },
    {
      heading: 'Glove selection is a material decision',
      body: 'Nitrile, latex and vinyl differ in barrier performance, fit and allergy exposure. Most practices settle on a primary material for clinical use and keep a secondary option for staff or patients who cannot use it.',
    },
    {
      heading: 'Room turnover sets your disinfectant needs',
      body: 'Surface disinfectant choice depends on contact time and material compatibility with your surfaces and equipment. A shorter contact time genuinely changes how many patients a room can take in a day.',
    },
  ],
  pharmacies: [
    {
      heading: 'Dispensing supplies are a throughput decision',
      body: 'Vials, bags, labels and closures are bought on consistency rather than novelty. Keeping to one supplier specification avoids the fit problems that appear when closures and vials come from different lines.',
    },
    {
      heading: 'Front-of-shop testing has become core stock',
      body: 'Rapid tests and monitoring supplies are now routine pharmacy stock. Check sample type and read time before standardising, and keep the range narrow enough that staff can advise on it confidently.',
    },
    {
      heading: 'Home-care items support the same customers',
      body: 'Pharmacy customers frequently need the home-care range in the same visit — incontinence, mobility aids and wound supplies. Stocking a small core of these captures demand that otherwise leaves the store.',
    },
  ],
}

export function getIndustryCategoryLinks(slug: string) {
  return CATEGORY_LINKS[slug] ?? []
}

export function getIndustryBuyingGuide(slug: string) {
  return BUYING_GUIDES[slug] ?? []
}
