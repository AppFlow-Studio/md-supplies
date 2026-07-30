export const EXCLUDED_COLLECTION_HANDLES = new Set([
  // §2.4 — permanently removed from public scope
  // ('beds' removed from this set 2026-07-17: the category-tree ticket places
  // Beds — 304 products, all category:room-furniture — under Room Furniture,
  // superseding the older §2.4 removal. bariatric-beds stays excluded.)
  'pharmaceuticals',
  'bariatric-beds',
  'maternity-and-infant-care',
  'maternity-infant-care',

  // §2.4 — hidden at launch unless explicitly approved
  'office-supplies',

  // Junk/duplicate Shopify collection — not part of the roadmap taxonomy.
  // Title is literally "Categories"; its real children (trocar collections)
  // are used directly by the Surgery & Procedure mapping in lib/category-nav.ts.
  'categories-categories-surgery-procedure-categories-surgery-procedure-instruments-trays',
])
