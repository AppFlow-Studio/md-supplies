'use client'

import Link from "next/link";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/ui/FadeIn";
import type { CollectionProduct } from "@/lib/shopify/types";

interface Props {
  products: CollectionProduct[];
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export function PopularProducts({ products }: Props) {
  return (
    <section className="w-full bg-neutral-50">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">

        <FadeIn>
          <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px] mb-8">
            Popular products
          </h2>
        </FadeIn>

        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {products.map((product) => {
            const variant = product.variants.nodes[0];
            const price = parseFloat(
              variant?.price.amount ?? product.priceRange.minVariantPrice.amount,
            );
            const image = product.images.nodes[0];

            return (
              <motion.div key={product.id} variants={itemVariants} className="bg-white flex flex-col">

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

                <div className="flex flex-col gap-1.5 p-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-teal-500 tracking-[0.26px]">
                      {product.vendor}
                    </span>
                    <span className="text-[13px] font-semibold text-gray-500/60 tracking-[0.26px]">
                      {product.availableForSale ? "in stock" : "out of stock"}
                    </span>
                  </div>

                  <p className="text-[14px] font-semibold text-black leading-snug line-clamp-3">
                    {product.title}
                  </p>
                  <p className="text-[18px] font-bold text-black tracking-[0.36px] mt-auto pt-1">
                    ${price.toFixed(2)} USD
                  </p>
                  <Link
                    href={`/product/${product.handle}`}
                    className="mt-2 bg-navy-900 text-white text-[12px] font-semibold text-center py-2.5 flex items-center justify-center gap-1.5 hover:bg-navy-950 transition-colors"
                  >
                    <Plus size={13} />
                    Quick Add
                  </Link>
                </div>

              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}
