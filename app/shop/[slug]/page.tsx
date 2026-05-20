import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/products";
import { ProductDetail } from "@/components/shop/ProductDetail";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  return {
    title: `${product.name} | MD Supplies`,
    description: `${product.brand} — ${product.description.slice(0, 140)}...`,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  return (
    <main className="bg-[#f9fafc]">
      <ProductDetail product={product} />
    </main>
  );
}
