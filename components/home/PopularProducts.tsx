import Link from "next/link";
import { Star, Plus } from "lucide-react";
import type { CollectionProduct } from "@/lib/shopify/types";

interface Props {
  products: CollectionProduct[];
}

export function PopularProducts({ products }: Props) {
  return (
    <section className="w-full bg-neutral-50">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">

        <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px] mb-8">
          Popular products
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((product) => {
            const variant = product.variants.nodes[0];
            const price = parseFloat(
              variant?.price.amount ?? product.priceRange.minVariantPrice.amount,
            );
            const image = product.images.nodes[0];

            return (
              <div key={product.id} className="bg-white flex flex-col">

                {/* Product image */}
                <Link
                  href={`/product/${product.handle}`}
                  className="group overflow-hidden aspect-square bg-gray-50 block"
                >
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image.url}
                      alt={image.altText ?? product.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100" />
                  )}
                </Link>

                {/* Product info */}
                <div className="flex flex-col gap-1.5 p-3 flex-1">

                  {/* Brand + stock */}
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-teal-500 tracking-[0.26px]">
                      {product.vendor}
                    </span>
                    <span className="text-[13px] font-semibold text-gray-500/60 tracking-[0.26px]">
                      {product.availableForSale ? "in stock" : "out of stock"}
                    </span>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={11} className="text-[#f5a623] fill-[#f5a623]" />
                    ))}
                  </div>

                  {/* Name */}
                  <p className="text-[14px] font-semibold text-black leading-snug line-clamp-3">
                    {product.title}
                  </p>

                  {/* Price */}
                  <p className="text-[18px] font-bold text-black tracking-[0.36px] mt-auto pt-1">
                    ${price.toFixed(2)} USD
                  </p>

                  {/* Quick Add */}
                  <Link
                    href={`/product/${product.handle}`}
                    className="mt-2 bg-navy-900 text-white text-[12px] font-semibold text-center py-2.5 flex items-center justify-center gap-1.5 hover:bg-navy-950 transition-colors"
                  >
                    <Plus size={13} />
                    Quick Add
                  </Link>

                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
