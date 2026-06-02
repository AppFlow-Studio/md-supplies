'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { FadeIn } from '@/components/ui/FadeIn'
import { INDUSTRIES } from '@/lib/industries'
import { ROUTES } from '@/lib/routes'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export function ShopByIndustry() {
  return (
    <section className="w-full bg-neutral-50">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">

        <FadeIn className="flex items-center justify-between mb-8">
          <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px]">
            Shop By Industry
          </h2>
          <Link
            href={ROUTES.industries}
            className="text-[15px] font-semibold text-gray-500 hover:text-navy-900 transition-colors whitespace-nowrap"
          >
            All Industries →
          </Link>
        </FadeIn>

        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {INDUSTRIES.map(({ name, slug, image }) => (
            <motion.div key={slug} variants={itemVariants}>
              <Link
                href={ROUTES.industry(slug)}
                className="group relative overflow-hidden aspect-[314/390] block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image}
                  alt={name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/65" />
                <span className="absolute bottom-5 left-5 text-white text-[20px] font-semibold tracking-[0.4px] drop-shadow-sm">
                  {name}
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  )
}
