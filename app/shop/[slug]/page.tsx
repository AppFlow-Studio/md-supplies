import type { Metadata } from "next";
import { storefrontFetch } from "@/lib/shopify/storefront";
import { GET_PRODUCT } from "@/lib/shopify/queries/products";
import type { Product, ProductMetafields } from "@/lib/shopify/types";
import { getProductBySlug, type ProductDetailData } from "@/lib/products";
import { ProductDetail } from "@/components/shop/ProductDetail";

interface Props {
  params: Promise<{ slug: string }>;
}

type RawMetafield = { value: string } | null
type RawProduct = Omit<Product, keyof ProductMetafields> & {
  [K in keyof ProductMetafields]: RawMetafield
}

function normalizeProduct(raw: RawProduct): Product {
  const mv = (m: RawMetafield): string | null => m?.value ?? null
  return {
    ...raw,
    brandName:            mv(raw.brandName),
    unitsPerOrder:        mv(raw.unitsPerOrder),
    quantityOfUnits:      mv(raw.quantityOfUnits),
    orderSize:            mv(raw.orderSize),
    material:             mv(raw.material),
    use:                  mv(raw.use),
    features:             mv(raw.features),
    color:                mv(raw.color),
    sterility:            mv(raw.sterility),
    thickness:            mv(raw.thickness),
    gloveSize:            mv(raw.gloveSize),
    needleGauge:          mv(raw.needleGauge),
    needleLength:         mv(raw.needleLength),
    sizeLength:           mv(raw.sizeLength),
    estimatedRestockDate: mv(raw.estimatedRestockDate),
    testsFor:             mv(raw.testsFor),
    detectableDrugs:      mv(raw.detectableDrugs),
    adulterants:          mv(raw.adulterants),
    otherFeatures:        mv(raw.otherFeatures),
    typeList:             mv(raw.typeList),
    customBadge1:         mv(raw.customBadge1),
    customBadge2:         mv(raw.customBadge2),
    customBadge3:         mv(raw.customBadge3),
  }
}

function toProductDetailData(p: Product): ProductDetailData {
  const firstVariant = p.variants.nodes[0]
  const firstPrice = firstVariant ? parseFloat(firstVariant.price.amount) : 0
  const compareAt = firstVariant?.compareAtPrice
    ? parseFloat(firstVariant.compareAtPrice.amount)
    : undefined
  const savePct =
    compareAt && compareAt > firstPrice
      ? Math.round(((compareAt - firstPrice) / compareAt) * 100)
      : undefined

  const units = p.variants.nodes.map((v) => {
    const price = parseFloat(v.price.amount)
    return {
      label: v.title,
      qtyLabel: v.title,
      price,
      priceLabel: `$${price.toFixed(2)}`,
    }
  })

  return {
    id: 0,
    slug: p.handle,
    brand: p.brandName ?? p.vendor,
    sku: firstVariant?.id.split('/').pop() ?? p.handle,
    name: p.title,
    rating: 0,
    reviewCount: 0,
    inStock: p.availableForSale,
    freeShipping: p.tags.includes('free-shipping'),
    images: p.images.nodes.map((img) => img.url),
    units: units.length > 0
      ? units
      : [{ label: 'Each', qtyLabel: 'Each', price: firstPrice, priceLabel: `$${firstPrice.toFixed(2)}` }],
    strikePrice: compareAt && compareAt > firstPrice ? compareAt : undefined,
    savePct,
    saleLabel: savePct ? 'Limited time' : undefined,
    description: p.description || 'Professional medical supply.',
    keyFeatures: [],
    specifications: [],
    orderingInfo:
      'Orders placed before 3 PM EST ship same day. Standard delivery is 2–3 business days.',
    commonlyPurchasedWith: [],
    youMayAlsoNeed: [],
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await storefrontFetch<{ product: RawProduct | null }>(GET_PRODUCT, { handle: slug })
    if (data.product) {
      const product = normalizeProduct(data.product)
      const brand = product.brandName ?? product.vendor
      return {
        title: `${product.title} | MD Supplies`,
        description: `${brand} — ${product.description.slice(0, 140)}`,
      }
    }
    const fallback = getProductBySlug(slug)
    return { title: `${fallback.name} | MD Supplies` }
  } catch {
    return { title: 'Product | MD Supplies' }
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  const data = await storefrontFetch<{ product: RawProduct | null }>(GET_PRODUCT, { handle: slug })

  const productDetailData = data.product
    ? toProductDetailData(normalizeProduct(data.product))
    : getProductBySlug(slug)

  return (
    <main className="bg-[#f9fafc]">
      <ProductDetail product={productDetailData} />
    </main>
  );
}
