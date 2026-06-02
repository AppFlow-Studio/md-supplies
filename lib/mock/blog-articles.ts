import type { BlogArticle } from '@/types/blog'

const suturesArticleSummary = {
  slug: 'types-of-sutures',
  title: 'Types of Sutures: A Complete Guide for Healthcare Professionals',
  featuredImage: {
    url: 'https://placehold.co/1200x630/e5eff7/0086b1?text=Types+of+Sutures',
    altText: 'Surgical suture materials on a sterile field',
    width: 1200,
    height: 630,
  },
  publishedAt: '2024-03-10T00:00:00Z',
  modifiedAt: '2024-11-01T00:00:00Z',
  excerpt: 'A complete guide to absorbable vs non-absorbable sutures, suture sizing, and how to choose the right material for every wound type.',
  topic: 'Guides',
  author: { name: 'MDSupplies Clinical Team' },
}

const needlesArticleSummary = {
  slug: 'types-of-needles',
  title: 'Types of Needles: Suture Needle Guide for Clinicians',
  featuredImage: {
    url: 'https://placehold.co/1200x630/f0fdf4/166534?text=Types+of+Needles',
    altText: 'Assortment of suture needles on a surgical tray',
    width: 1200,
    height: 630,
  },
  publishedAt: '2024-02-15T00:00:00Z',
  modifiedAt: '2024-10-20T00:00:00Z',
  excerpt: 'Learn the differences between cutting, taper, and blunt suture needles, how needle sizing works, and how to choose the right needle for your procedure.',
  topic: 'Guides',
  author: { name: 'MDSupplies Clinical Team' },
}

export const mockBlogArticles: BlogArticle[] = [
  {
    ...needlesArticleSummary,
    publisher: 'MDSupplies',
    tableOfContents: [
      { id: 'needle-anatomy', text: 'Needle Anatomy', level: 2 },
      { id: 'suture-needle-types', text: 'Types of Suture Needles', level: 2 },
      { id: 'cutting-needles', text: 'Cutting Needles', level: 3 },
      { id: 'taper-needles', text: 'Taper (Round) Needles', level: 3 },
      { id: 'blunt-needles', text: 'Blunt Needles', level: 3 },
      { id: 'needle-sizing', text: 'Needle Sizing & Packaging', level: 2 },
      { id: 'choosing-needle', text: 'How to Choose the Right Needle', level: 2 },
    ],
    body: `
<p>Selecting the right suture needle is as important as selecting the right suture material. The needle determines how the suture enters tissue, the amount of trauma caused, and the risk of needlestick injury to staff. This guide covers the anatomy, types, and selection criteria for suture needles used in clinical settings.</p>

<h2 id="needle-anatomy">Needle Anatomy</h2>
<p>Every suture needle has three main components: the <strong>swage</strong> (the attachment point where suture thread is crimped onto the needle), the <strong>body</strong> (the main shaft, which may be round, triangular, or flattened in cross-section), and the <strong>point</strong> (the sharpened tip that penetrates tissue). The radius of curvature — expressed as a fraction of a circle — determines how the needle passes through tissue and affects access in deep or confined spaces.</p>
<p>Common curvature designations include <strong>3/8 circle</strong> (most versatile, used for most soft tissue), <strong>1/2 circle</strong> (deep or confined spaces), and <strong>straight (Keith)</strong> (subcutaneous and skin closure with needle holders).</p>

<h2 id="suture-needle-types">Types of Suture Needles</h2>
<p>Needles are broadly classified by their point geometry, which determines what tissue they are suited for.</p>

<h3 id="cutting-needles">Cutting Needles</h3>
<p>Cutting needles have a triangular cross-section with a sharp cutting edge. <strong>Conventional cutting</strong> needles have the cutting edge on the inside (concave) curve; <strong>reverse cutting</strong> needles have it on the outside (convex) curve. Reverse cutting is the more commonly used design because it reduces the risk of the suture tearing through tissue toward the wound edge.</p>
<p>Cutting needles are used for tough, fibrous tissue including <strong>skin, subcutaneous fascia, and tendon</strong>. They are not recommended for visceral or vascular tissue, where taper needles are preferred.</p>

<h3 id="taper-needles">Taper (Round) Needles</h3>
<p>Taper needles have a round body that tapers to a sharp point without any cutting edge. Rather than cutting tissue, they <strong>spread tissue fibers apart</strong>, which minimizes trauma and allows the tissue to close snugly around the suture.</p>
<p>Taper needles are the standard choice for <strong>visceral tissue, muscle, subcutaneous fat, peritoneum, and vascular anastomosis</strong>. Their atraumatic design makes them particularly suitable wherever watertight closure is needed.</p>

<h3 id="blunt-needles">Blunt Needles</h3>
<p>Blunt needles have a rounded, non-sharp tip. They cannot pierce intact gloves and are designed primarily to reduce <strong>needlestick injury risk to surgical staff</strong>. They are used for suturing <strong>fascia and muscle tissue</strong> where the blunt tip can still penetrate without causing excessive trauma.</p>
<p>Blunt needles are increasingly mandated in high-risk surgical environments and are recommended by OSHA guidelines for fascial closure in abdominal surgery.</p>

<h2 id="needle-sizing">Needle Sizing &amp; Packaging</h2>
<p>Needle size is designated by manufacturer codes that combine body diameter (gauge) and radius of curvature. Larger-diameter needles provide more strength for heavy tissue; smaller needles cause less trauma for delicate work. Most suture-needle combinations are packaged as <strong>armed sutures</strong> — needle and thread pre-attached — in sterile foil peel pouches.</p>
<p>Packaging typically indicates needle type (e.g., FS-2, CT-1, SH), suture gauge (e.g., 3-0, 2-0, 0), suture material, and needle count per box. MDSupplies stocks a full range of armed sutures from leading brands including <a href="/category/sutures">Ethicon, Covidien, and Medline</a>.</p>

<h2 id="choosing-needle">How to Choose the Right Needle</h2>
<p>Needle selection depends on tissue type, wound depth, and access constraints:</p>
<ul>
<li><strong>Skin and fibrous tissue:</strong> reverse cutting, 3/8 circle</li>
<li><strong>Viscera, muscle, peritoneum:</strong> taper (round), 1/2 circle</li>
<li><strong>Deep confined spaces:</strong> 1/2 circle or J-needle</li>
<li><strong>Fascia closure (high-risk environments):</strong> blunt needle</li>
<li><strong>Vascular anastomosis:</strong> fine taper, small-gauge, double-armed</li>
</ul>
<p>Browse our complete selection of <a href="/category/needles">suture needles</a> and <a href="/category/sutures">suture materials</a> at wholesale prices for licensed healthcare facilities.</p>
`,
    relatedArticles: [suturesArticleSummary],
    relatedProducts: [
      { handle: 'nitrile-exam-gloves-powder-free', title: 'Nitrile Exam Gloves', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Gloves', price: 2499 },
    ],
    relatedCategories: [
      { handle: 'needles', title: 'Suture Needles' },
      { handle: 'sutures', title: 'Sutures & Wound Closure' },
    ],
    seoTitle: 'Types of Suture Needles: Cutting, Taper & Blunt Guide',
    seoDescription: 'Learn the differences between cutting, taper, and blunt suture needles, how needle sizing works, and how to choose the right needle for your procedure.',
  },
  {
    ...suturesArticleSummary,
    publisher: 'MDSupplies',
    tableOfContents: [
      { id: 'absorbable-sutures', text: 'Absorbable Sutures', level: 2 },
      { id: 'non-absorbable-sutures', text: 'Non-Absorbable Sutures', level: 2 },
      { id: 'natural-vs-synthetic', text: 'Natural vs Synthetic', level: 3 },
      { id: 'monofilament-vs-multifilament', text: 'Monofilament vs Multifilament', level: 3 },
      { id: 'suture-sizing', text: 'Suture Sizing (USP Scale)', level: 2 },
      { id: 'choosing-suture', text: 'Choosing the Right Suture', level: 2 },
    ],
    body: `
<p>Suture selection is one of the most consequential decisions in wound management. The right suture supports healing, minimizes infection risk, and avoids unnecessary secondary procedures. This guide covers absorbable vs non-absorbable sutures, material classifications, sizing, and clinical selection criteria.</p>

<h2 id="absorbable-sutures">Absorbable Sutures</h2>
<p>Absorbable sutures are broken down by the body's natural enzymatic or hydrolytic processes over time, eliminating the need for removal. They are used for <strong>internal tissue layers, subcutaneous closure, and any site where removal would be impractical</strong>.</p>
<p>Common absorbable materials include:</p>
<ul>
<li><strong>Plain gut:</strong> derived from sheep submucosa or beef serosa; absorbed by enzymatic digestion in 10–14 days. Used for mucosa and superficial tissue.</li>
<li><strong>Chromic gut:</strong> plain gut treated with chromium salts to slow absorption to 21–28 days. Suitable for deeper tissue.</li>
<li><strong>Polyglycolic acid (PGA / Dexon):</strong> synthetic, hydrolytic absorption in 60–90 days. Minimal tissue reaction.</li>
<li><strong>Polyglactin 910 (Vicryl):</strong> synthetic braid; absorbed in 56–70 days. High initial tensile strength; widely used for fascial and subcutaneous closure.</li>
<li><strong>Poliglecaprone (Monocryl):</strong> monofilament synthetic; absorbed in 91–119 days. Excellent pliability; popular for subcuticular skin closure.</li>
</ul>

<h2 id="non-absorbable-sutures">Non-Absorbable Sutures</h2>
<p>Non-absorbable sutures are not degraded by the body and must be removed (for skin) or remain permanently (for internal permanent structures like tendon repair and vascular grafts). They maintain tensile strength indefinitely.</p>
<p>Common non-absorbable materials include:</p>
<ul>
<li><strong>Nylon (Ethilon, Dermalon):</strong> synthetic monofilament or braided. Excellent tensile strength; minimal tissue reactivity. Standard for skin closure and microsurgery.</li>
<li><strong>Polypropylene (Prolene, Surgipro):</strong> monofilament; extremely inert; used for vascular anastomosis and permanent fascial closure.</li>
<li><strong>Silk:</strong> natural braided suture; good handling but higher tissue reactivity. Used for ligatures and where knot security is paramount.</li>
<li><strong>Polyester (Mersilene, Ethibond):</strong> braided synthetic; high strength; used for cardiac and orthopedic procedures.</li>
</ul>

<h3 id="natural-vs-synthetic">Natural vs Synthetic</h3>
<p>Natural sutures (gut, silk) are derived from biological sources and tend to cause more tissue inflammation. Synthetic sutures (nylon, polypropylene, PGA) are manufactured polymers with more predictable absorption profiles and lower reactivity. For most modern clinical applications, synthetic sutures are preferred.</p>

<h3 id="monofilament-vs-multifilament">Monofilament vs Multifilament</h3>
<p><strong>Monofilament</strong> sutures are a single strand: they pass through tissue smoothly and resist harboring bacteria (lower infection risk). They are stiffer and require more throws to secure knots.</p>
<p><strong>Multifilament (braided)</strong> sutures are easier to handle and tie, with better knot security, but their braided surface can harbor microorganisms, increasing infection risk in contaminated wounds.</p>

<h2 id="suture-sizing">Suture Sizing (USP Scale)</h2>
<p>The United States Pharmacopeia (USP) scale measures suture diameter. Higher numbers indicate finer sutures; "0" designations indicate thicker material. The scale runs:</p>
<ul>
<li><strong>Thickest:</strong> #5, #4, #3, #2, #1, #0 (used for heavy fascial and orthopedic work)</li>
<li><strong>Mid-range:</strong> 2-0 (00), 3-0 (000) (general soft tissue, skin)</li>
<li><strong>Fine:</strong> 4-0, 5-0 (plastic surgery, facial, ophthalmic)</li>
<li><strong>Micro:</strong> 6-0, 7-0, 8-0, 9-0, 10-0 (vascular and neurological microsurgery)</li>
</ul>

<h2 id="choosing-suture">Choosing the Right Suture</h2>
<p>Select suture material based on tissue healing rate, infection risk, and whether permanent support is needed:</p>
<ul>
<li><strong>Skin (low tension):</strong> 4-0 or 5-0 nylon or polypropylene; remove in 5–14 days</li>
<li><strong>Subcuticular skin closure:</strong> 4-0 Monocryl (absorbable, no removal needed)</li>
<li><strong>Subcutaneous fat:</strong> 3-0 Vicryl or PGA</li>
<li><strong>Fascia:</strong> 0 or 1 PGA, PDS, or polypropylene</li>
<li><strong>Muscle:</strong> 2-0 or 3-0 PGA</li>
<li><strong>Mucosa / oral:</strong> 3-0 or 4-0 plain or chromic gut</li>
<li><strong>Vascular anastomosis:</strong> 5-0 to 7-0 polypropylene</li>
</ul>
<p>Browse MDSupplies' full selection of <a href="/category/sutures">suture materials</a> and <a href="/category/needles">suture needles</a> at wholesale prices. Licensed healthcare facilities can apply for OCC program pricing.</p>
`,
    relatedArticles: [needlesArticleSummary],
    relatedProducts: [
      { handle: 'nitrile-exam-gloves-powder-free', title: 'Nitrile Exam Gloves', image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Gloves', price: 2499 },
    ],
    relatedCategories: [
      { handle: 'sutures', title: 'Sutures & Wound Closure' },
      { handle: 'needles', title: 'Suture Needles' },
      { handle: 'wound-care', title: 'Wound Care' },
    ],
    seoTitle: 'Types of Sutures: Absorbable vs Non-Absorbable Guide',
    seoDescription: 'A complete guide to absorbable vs non-absorbable sutures, suture sizing, and how to choose the right material for every wound type.',
  },
  {
    slug: 'pharmacy-supply-checklist',
    title: 'Essential Pharmacy Supply Checklist for Independent Pharmacies',
    featuredImage: {
      url: 'https://placehold.co/1200x630/fef9c3/854d0e?text=Pharmacy+Checklist',
      altText: 'Pharmacy counter with supply inventory',
      width: 1200,
      height: 630,
    },
    publishedAt: '2024-04-05T00:00:00Z',
    excerpt: 'A practical checklist of essential supplies every independent pharmacy should stock — from compounding materials to OTC staples.',
    topic: 'Guides',
    author: { name: 'MDSupplies Editorial Team' },
    publisher: 'MDSupplies',
    body: `<p>Running a well-stocked independent pharmacy requires careful inventory management. This checklist covers the essential supply categories every pharmacy should maintain.</p>
<h2 id="compounding-supplies">Compounding Supplies</h2>
<p>For pharmacies that compound, sterile technique supplies are non-negotiable: nitrile gloves, syringes, vials, and laminar flow hood consumables. Ensure USP 795/797 compliance at all times.</p>
<h2 id="otc-essentials">OTC Essentials</h2>
<p>Stock adequate quantities of bandages, antiseptics, and common OTC medications. High-velocity items like exam gloves and hand sanitizer should have standing reorder points.</p>
<p>Browse our full <a href="/category/prescription-supplies">pharmacy supplies catalog</a>.</p>`,
    relatedArticles: [suturesArticleSummary, needlesArticleSummary],
    relatedCategories: [
      { handle: 'prescription-supplies', title: 'Prescription Supplies' },
      { handle: 'compounding', title: 'Compounding Supplies' },
    ],
  },
  {
    slug: 'urgent-care-supply-checklist',
    title: 'Urgent Care Supply Checklist: What Every Center Needs',
    featuredImage: {
      url: 'https://placehold.co/1200x630/dbeafe/1d4ed8?text=Urgent+Care+Checklist',
      altText: 'Urgent care exam room supply tray',
      width: 1200,
      height: 630,
    },
    publishedAt: '2024-05-12T00:00:00Z',
    excerpt: 'From exam gloves to wound care kits, here is what a fully stocked urgent care center should have on hand at all times.',
    topic: 'Guides',
    author: { name: 'MDSupplies Editorial Team' },
    publisher: 'MDSupplies',
    body: `<p>Urgent care centers see a wide variety of patients — from minor lacerations to respiratory complaints. Having the right supplies on hand prevents delays and improves patient outcomes.</p>
<h2 id="exam-room-basics">Exam Room Basics</h2>
<p>Every exam room needs: nitrile or latex gloves (multiple sizes), exam table paper, tongue depressors, otoscope covers, and blood pressure cuffs. Restock daily based on patient volume.</p>
<h2 id="wound-care">Wound Care Supplies</h2>
<p>Maintain suture kits, staple removers, sterile gauze, adhesive bandages, antiseptic solution, and wound closure strips. Suture needles and thread in common sizes (3-0, 4-0 nylon) should be stocked in quantity.</p>
<p>Browse our <a href="/category/exam-room">exam room supplies</a> and <a href="/category/wound-care">wound care catalog</a>.</p>`,
    relatedArticles: [suturesArticleSummary, needlesArticleSummary],
    relatedCategories: [
      { handle: 'exam-room', title: 'Exam Room Supplies' },
      { handle: 'wound-care', title: 'Wound Care' },
    ],
  },
]

export function getBlogArticleBySlug(slug: string): BlogArticle | undefined {
  return mockBlogArticles.find((a) => a.slug === slug)
}
