import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_COLLECTIONS } from '../lib/shopify/queries/collections'

// Revised 2026-06-13: updated to match live Shopify collection handles.
// Original wishlist (exam-gloves, gloves-nitrile, iv-therapy, respiratory, etc.) had no matching collections.
const APPROVED_CATEGORIES = [
	// Gloves & hand protection
	'gloves',             // replaces: exam-gloves
	'surgical-gloves',    // replaces: gloves-sterile

	// Wound & skin
	'wound-care',
	'skin-preparation',   // replaces: surgical / bandages / gauze area

	// Injection & blood
	'blood-collection',   // replaces: needles-syringes / needles / syringes

	// Diagnostics & monitoring
	'testing-screening',  // replaces: diagnostics
	'diagnostic-tools',
	'blood-pressure',

	// Exam room & dental
	'exam-room',
	'dental',

	// Continence & personal care
	'incontinence',
	'hygiene',            // replaces: personal-care
	'mouth-care',

	// Home care & DME
	'home-care',          // replaces: dme (partial)
	'mobility',           // replaces: mobility-aids
	'bariatric',
	'braces-support',

	// Therapy & rehab
	'patient-therapy-rehab',
	'hot-cold-therapy',

	// Emergency & facility
	'emergency-supplies', // replaces: emergency / first-aid
	'housekeeping-janitorial',
	'bags',
	'cotton',
	'seating',

	// PPE & apparel
	'capes-gowns',        // replaces: ppe (partial)
	'caps-headwear',
]

async function main() {
	const data = await storefrontFetch<{ collections: { nodes: { handle: string; title: string }[] } }>(
		GET_COLLECTIONS,
		{ first: 250 },
	)
	const liveHandles = new Set(data.collections.nodes.map((c) => c.handle))

	console.log('\n## Approved Category → Shopify Collection Mapping\n')
	console.log('| Approved Category Handle | Shopify Match | Status |')
	console.log('|---|---|---|')

	for (const handle of APPROVED_CATEGORIES) {
		const exists = liveHandles.has(handle)
		console.log(`| ${handle} | ${exists ? handle : '— NOT FOUND —'} | ${exists ? '✅' : '❌ Missing'} |`)
	}

	console.log('\n## All Live Collections\n')
	for (const c of data.collections.nodes) {
		console.log(`- ${c.handle} → "${c.title}"`)
	}
}

main().catch(console.error)