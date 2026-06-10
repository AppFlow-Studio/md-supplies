"use client";

import { motion } from "framer-motion";
import { FeaturedProductCard } from "./FeaturedProductCard";
import type { OCCProduct } from "@/types/occ";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.5, ease: "easeOut" as const } },
};

export function AnimatedOCCProducts({ products }: { products: OCCProduct[] }) {
  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.1 }}
    >
      {products.map((p) => (
        <motion.div key={p.handle} variants={item} className="h-full">
          <FeaturedProductCard product={p} />
        </motion.div>
      ))}
    </motion.div>
  );
}
