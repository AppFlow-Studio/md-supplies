'use client'

import Link from "next/link";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/ui/FadeIn";

const INDUSTRIES = [
  {
    name: "Urgent Care",
    href: "/industries/urgent-care",
    img: "https://www.figma.com/api/mcp/asset/bce9ec8d-dd4e-4faf-85b1-f47ce6d1124c",
  },
  {
    name: "EMS",
    href: "/industries/ems",
    img: "https://www.figma.com/api/mcp/asset/b6de8838-e64a-4bf2-9ef1-cff96d90b28d",
  },
  {
    name: "Pharmacy",
    href: "/industries/pharmacy",
    img: "https://www.figma.com/api/mcp/asset/46383ec7-9c26-4ab3-9a2a-66fed0db01d5",
  },
  {
    name: "Physical Therapy",
    href: "/industries/physical-therapy",
    img: "https://www.figma.com/api/mcp/asset/f5c0d0c8-247d-4cbb-8cf5-c2756abc5171",
  },
];
import Link from 'next/link'
import { INDUSTRIES } from '@/lib/industries'

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export function ShopByIndustry() {
  return (
    <section className="w-full bg-neutral-50">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14 md:py-16">

        <FadeIn className="flex items-center justify-between mb-8">
          <h2 className="text-[28px] font-semibold text-navy-900 tracking-[0.56px]">
            Shop By Industry
          </h2>
          <Link
            href="/industries"
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
          {INDUSTRIES.map(({ name, href, img }) => (
            <motion.div key={name} variants={itemVariants}>
              <Link
                href={href}
                className="group relative overflow-hidden aspect-[314/390] block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
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
