'use client'

import Link from "next/link";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/ui/FadeIn";
import { ROUTES } from '@/lib/routes';

const CATEGORIES = [
  { title: 'Needles & Syringes', handle: 'needles-syringes',   icon: '/icons/category-logo-1.svg' },
  { title: 'PPE',                handle: 'ppe',                 icon: '/icons/category-logo-2.svg' },
  { title: 'Testing',            handle: 'testing',             icon: '/icons/category-logo-3.svg' },
  { title: 'Surgical Sutures',   handle: 'surgical-sutures',   icon: '/icons/category-logo-4.svg' },
  { title: 'Wound Care',         handle: 'wound-care',          icon: '/icons/category-logo-5.svg' },
  { title: 'Respiratory',        handle: 'respiratory',         icon: '/icons/category-logo-6.svg' },
  { title: 'Exam Room',          handle: 'exam-room',           icon: '/icons/category-logo-7.svg' },
  { title: 'Mobility',           handle: 'mobility',            icon: '/icons/category-logo-8.svg' },
]

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export function PopularCategories() {
  return (
    <section className="w-full bg-white">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">

        <FadeIn className="flex items-center justify-between mb-8">
          <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px]">
            Popular Categories
          </h2>
          <Link
            href={ROUTES.categories}
            className="text-[15px] font-semibold text-gray-500 hover:text-navy-900 transition-colors whitespace-nowrap"
          >
            Browse all categories →
          </Link>
        </FadeIn>

        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-px border border-[rgba(0,0,0,0.1)] bg-[rgba(0,0,0,0.1)]"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {CATEGORIES.map(({ title, handle, icon }) => (
            <motion.div key={handle} variants={itemVariants}>
              <Link
                href={ROUTES.category(handle)}
                className="group bg-white hover:bg-neutral-50 transition-colors flex flex-col items-center justify-center gap-4 py-10 px-4 h-full"
              >
                <div className="w-14 h-14 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={icon}
                    alt=""
                    aria-hidden="true"
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <span className="text-[14px] font-medium text-navy-900 text-center leading-snug">
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
