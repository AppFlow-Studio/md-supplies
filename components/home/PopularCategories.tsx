'use client'

import Link from "next/link";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/ui/FadeIn";

interface CollectionSummary {
  id: string;
  title: string;
  handle: string;
  image: { url: string; altText: string | null } | null;
}

interface Props {
  collections: CollectionSummary[];
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export function PopularCategories({ collections }: Props) {
  return (
    <section className="w-full bg-white">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">

        <FadeIn className="flex items-center justify-between mb-8">
          <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px]">
            Popular Categories
          </h2>
          <Link
            href="/shop"
            className="text-[15px] font-semibold text-gray-500 hover:text-navy-900 transition-colors whitespace-nowrap"
          >
            Browse all categories →
          </Link>
        </FadeIn>

        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-[1px] border border-[rgba(0,0,0,0.08)] bg-[rgba(0,0,0,0.08)]"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {collections.map(({ id, title, handle, image }) => (
            <motion.div key={id} variants={itemVariants}>
              <Link
                href={`/category/${handle}`}
                className="group bg-white hover:bg-neutral-50 transition-colors flex flex-col items-center justify-center gap-4 py-10 px-4 h-full"
              >
                <div className="w-[50px] h-[50px] rounded-xl bg-[rgba(0,193,255,0.15)] flex items-center justify-center overflow-hidden group-hover:bg-[rgba(0,193,255,0.25)] transition-colors">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image.url}
                      alt={image.altText ?? title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-teal-500 text-[20px] font-bold">
                      {title.charAt(0)}
                    </span>
                  )}
                </div>
                <span className="text-[15px] font-semibold text-navy-900 text-center leading-snug">
                  {title}
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
