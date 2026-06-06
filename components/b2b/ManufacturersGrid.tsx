'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

interface Manufacturer {
  name: string
  logo: string
  description: string
  vendorSlug: string
}

interface Props {
  manufacturers: Manufacturer[]
}

export function ManufacturersGrid({ manufacturers }: Props) {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {manufacturers.map((m, i) => (
        <motion.div
          key={m.vendorSlug}
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: (i % 3) * 0.08 }}
          className="h-full"
        >
          <Link
            href={`/brands/${m.vendorSlug}`}
            className="group flex flex-col bg-white h-full min-h-[258px] hover:shadow-lg transition-shadow duration-200"
          >
            <div className="flex items-center px-10 pt-8 pb-6 h-[110px]">
              <img
                src={m.logo}
                alt={`${m.name} logo`}
                className="max-h-[50px] w-auto max-w-[210px] object-contain"
                loading="lazy"
              />
            </div>

            <div className="h-px bg-gray-200 mx-10" />

            <div className="px-10 pt-5 pb-8 flex flex-col flex-1 gap-5">
              <p className="text-[15px] text-gray-500 leading-[22px] tracking-[0.3px] flex-1">
                {m.description}
              </p>
              <span className="text-[13px] font-medium text-teal-500 tracking-[0.26px] group-hover:underline">
                View Products →
              </span>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}
