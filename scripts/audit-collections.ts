import { storefrontFetch } from '../lib/shopify/storefront'
import { GET_COLLECTIONS } from '../lib/shopify/queries/collections'

const APPROVED_CATEGORIES = [
	'exam-gloves',
	'gloves-nitrile',
	'gloves-latex',
	'gloves-vinyl',
	'gloves-sterile',
	'wound-care',
	'bandages',
	'gauze',
	'sutures',
	'needles-syringes',
	'syringes',
	'needles',
	'iv-therapy',
	'respiratory',
	'oxygen-therapy',
	'diagnostics',
	'surgical',
	'ppe',
	'disposables',
	'personal-care',
	'dme',
	'mobility-aids',
	'emergency',
	'first-aid',
	'exam-room',
	'incontinence',
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