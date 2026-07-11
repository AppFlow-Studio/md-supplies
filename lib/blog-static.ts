import type { BlogArticle } from '@/lib/shopify/types'

export const STATIC_ARTICLES: Record<string, BlogArticle> = {
  'types-of-needles': {
    id: 'static-types-of-needles',
    handle: 'types-of-needles',
    title: 'Types of Needles Used in Medical Settings: A Complete Guide',
    excerpt: 'A practical guide to needle gauge, bevel types, needle lengths, and use cases — from intramuscular injections to blood draws.',
    publishedAt: '2026-06-17T00:00:00Z',
    author: { name: 'MDSupplies Editorial Team' },
    image: null,
    seo: null,
    tags: ['Needles', 'Clinical Guide'],
    contentHtml: `
<h2>Understanding Needle Gauge</h2>
<p>Needle gauge refers to the diameter of the needle's bore — the higher the gauge number, the thinner the needle. Gauge selection affects patient comfort, flow rate, and which tissues or fluids the needle is appropriate for.</p>
<ul>
  <li><strong>18–21 gauge:</strong> Large-bore needles used for blood draws, IV catheter insertion, and drawing up viscous medications.</li>
  <li><strong>22–25 gauge:</strong> Mid-range gauges used for intramuscular (IM) injections, most standard subcutaneous (SQ) injections, and venipuncture in smaller veins.</li>
  <li><strong>26–30 gauge:</strong> Fine-gauge needles used for insulin injections, allergy testing, intradermal injections, and pediatric or fragile-vein blood draws.</li>
</ul>
<p>Browse <a href="/category/needles-syringes">needles and syringes</a> on MDSupplies to find the gauge appropriate for your clinical setting.</p>

<h2>Bevel Types and Tip Styles</h2>
<p>The bevel is the angled cut at the tip of the needle. It affects how the needle pierces tissue and how smoothly it enters a vein or muscle.</p>
<ul>
  <li><strong>Regular bevel:</strong> Standard for most IM and SQ injections. Medium angle provides a balance of sharpness and tissue trauma.</li>
  <li><strong>Short bevel:</strong> A steeper angle for more controlled entry — common in intradermal injections such as TB skin tests and allergy panels.</li>
  <li><strong>Blunt-tip cannulas:</strong> Used for drawing medications from vials or transferring fluids without risk of coring the vial stopper.</li>
</ul>

<h2>Needle Length and Injection Depth</h2>
<p>Needle length determines the depth of delivery. Selecting the correct length ensures the medication reaches the intended tissue layer.</p>
<ul>
  <li><strong>⅜ in – ½ in:</strong> Intradermal or very shallow subcutaneous injections in pediatric patients or lean adults.</li>
  <li><strong>⅝ in – 1 in:</strong> Standard subcutaneous injections for insulin, heparin, and similar medications in adults.</li>
  <li><strong>1 in – 1½ in:</strong> Intramuscular injections targeting the deltoid, vastus lateralis, or ventrogluteal muscle in adults. Length varies based on patient body composition.</li>
  <li><strong>1½ in – 2 in:</strong> Deep IM injections in larger muscle groups or when greater tissue depth is required.</li>
</ul>

<h2>Common Use Cases by Needle Type</h2>
<p>Matching needle type to clinical task reduces patient discomfort and procedure risk:</p>
<ul>
  <li><strong>Phlebotomy / blood draws:</strong> 21–23 gauge, 1 in length, standard bevel.</li>
  <li><strong>IM injections (vaccines, hormones):</strong> 22–25 gauge, 1–1½ in, standard bevel.</li>
  <li><strong>SQ injections (insulin, anticoagulants):</strong> 25–28 gauge, ½–⅝ in, standard bevel.</li>
  <li><strong>Intradermal (TB test, allergy):</strong> 26–27 gauge, ⅜–½ in, short bevel.</li>
  <li><strong>IV access / catheter insertion:</strong> 18–20 gauge, winged infusion set or over-the-needle catheter.</li>
  <li><strong>Drawing up medications:</strong> 18-gauge blunt-tip filter needle or standard needle from multi-dose vials.</li>
</ul>

<h2>Choosing the Right Needle for Your Setting</h2>
<p>Clinical setting, patient population, and procedure type all influence the right needle selection. Urgent care centers and primary care practices typically maintain a range of gauges from 21 to 27 and lengths from ½ in to 1½ in to cover most common procedures. HRT clinics performing pellet insertions and hormone injections require specialized needles matched to their specific protocols.</p>
<p>MDSupplies carries needles, syringes, and injection supplies from trusted manufacturers. Browse the <a href="/category/needles-syringes">needles and syringes category</a> to find the right gauge, length, and bevel for your clinical needs — with ordering options suited to practice-level and bulk volumes.</p>
    `.trim(),
  },

  'types-of-sutures': {
    id: 'static-types-of-sutures',
    handle: 'types-of-sutures',
    title: 'Types of Sutures: Absorbable, Non-Absorbable, and When to Use Each',
    excerpt: 'A clinical overview of suture materials, absorbability, thread construction, and wound closure guidance for healthcare professionals.',
    publishedAt: '2026-06-17T00:00:00Z',
    author: { name: 'MDSupplies Editorial Team' },
    image: null,
    seo: null,
    tags: ['Sutures', 'Wound Care', 'Clinical Guide'],
    contentHtml: `
<h2>Absorbable vs. Non-Absorbable Sutures</h2>
<p>The most fundamental distinction in suture selection is whether the suture material is absorbed by the body over time or must be removed manually.</p>
<ul>
  <li><strong>Absorbable sutures</strong> are broken down by the body through enzymatic degradation or hydrolysis. They are used for internal layers, subcutaneous closures, and situations where suture removal would be impractical or distressing (pediatric patients, mucosal tissue). Absorption timelines range from 10 days to several months depending on the material.</li>
  <li><strong>Non-absorbable sutures</strong> remain intact indefinitely and must be removed by a clinician. They are preferred for skin closures, external wounds, and situations requiring long-term tensile strength. Common removal windows are 3–14 days depending on wound location.</li>
</ul>

<h2>Monofilament vs. Braided Sutures</h2>
<p>Thread construction affects handling, knot security, and infection risk:</p>
<ul>
  <li><strong>Monofilament:</strong> A single continuous strand that glides through tissue with minimal drag and has lower bacterial wicking. Easier to remove. Requires more throws to secure a knot and has more memory (springback during tying). Common monofilament sutures include nylon (Ethilon), polypropylene (Prolene), and poliglecaprone (Monocryl — absorbable).</li>
  <li><strong>Braided / multifilament:</strong> Multiple strands twisted or braided together for superior knot security and handling. Braided sutures have more tissue drag and a higher theoretical risk of bacterial colonization in contaminated wounds. Common braided sutures include polyglactin 910 (Vicryl — absorbable), polyester (Ethibond), and silk.</li>
</ul>

<h2>Common Suture Materials and Their Uses</h2>
<p>Understanding each material helps clinicians select the right suture for the tissue type and healing environment:</p>
<ul>
  <li><strong>Polyglactin 910 (Vicryl):</strong> Braided, absorbable. Absorbed in 56–70 days. Widely used for subcutaneous closures, fascial repair, and mucosal tissue. Excellent knot security.</li>
  <li><strong>Poliglecaprone (Monocryl):</strong> Monofilament, absorbable. Absorbed in 91–119 days. Smooth passage through tissue; often used for subcuticular skin closures and delicate tissue.</li>
  <li><strong>Chromic gut:</strong> Natural absorbable suture treated with chromic salts to slow absorption (21–28 days). Used in mucosal and highly vascular tissue such as the vaginal cuff, oral mucosa, and bladder.</li>
  <li><strong>Nylon (Ethilon, Dermalon):</strong> Monofilament, non-absorbable. Excellent tensile strength with low reactivity. Standard choice for skin closure; must be removed post-healing.</li>
  <li><strong>Polypropylene (Prolene):</strong> Monofilament, non-absorbable. Minimal tissue reactivity; used in vascular anastomosis, cardiovascular surgery, and skin closures where long-term strength is needed.</li>
  <li><strong>Silk:</strong> Braided, non-absorbable (though it does degrade slowly). Easy handling and knot security; historically common but now largely replaced by synthetic materials. Still used in ophthalmic and cardiovascular settings.</li>
  <li><strong>Polyester (Ethibond, Mersilene):</strong> Braided, non-absorbable. High tensile strength for cardiovascular and orthopedic applications.</li>
</ul>

<h2>Suture Size and Tissue Selection</h2>
<p>Suture size is expressed as a number of zeros — the more zeros, the finer the suture. A 2-0 (two-zero) suture is thicker than a 5-0:</p>
<ul>
  <li><strong>0 – 1:</strong> Heavy tissue — fascia, abdominal wall closure, orthopedic repair.</li>
  <li><strong>2-0 – 3-0:</strong> Subcutaneous layers, muscle, and moderate-tension skin closures.</li>
  <li><strong>4-0:</strong> General skin closure on most body areas; also used for oral mucosa and pediatric wounds.</li>
  <li><strong>5-0 – 6-0:</strong> Delicate tissue — facial lacerations, hand and finger repairs, plastic surgery closures.</li>
  <li><strong>7-0 and finer:</strong> Ophthalmic and microsurgical procedures.</li>
</ul>

<h2>Wound Closure Best Practices</h2>
<p>Suture selection is one component of successful wound closure. Additional considerations for clinical settings:</p>
<ul>
  <li>Match suture absorption timeline to expected wound healing time — a suture that loses strength before the wound closes creates dehiscence risk.</li>
  <li>Use absorbable suture for internal layers so patients do not require a second procedure for removal.</li>
  <li>In contaminated or infection-prone wounds, monofilament sutures reduce bacterial wicking compared to braided alternatives.</li>
  <li>Needle selection matters as much as thread — tapered needles for soft internal tissue, cutting needles for tough skin and fascia.</li>
</ul>
<p>MDSupplies carries sutures and wound closure supplies from established manufacturers. Browse the <a href="/category/wound-care">wound care category</a> and <a href="/category/surgical-sutures">surgical sutures</a> to find the right material, size, and needle type for your clinical needs.</p>
    `.trim(),
  },
}
