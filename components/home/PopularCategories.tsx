'use client'

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Syringe, Shield, FlaskConical, Scissors, Bandage, Wind,
  Stethoscope, Accessibility, Pill, Thermometer, Microscope,
  Bone, Brain, Eye, Ear, HeartPulse, Dna, Hospital, Package,
  type LucideIcon,
} from "lucide-react";
import { FadeIn } from "@/components/ui/FadeIn";
import { ROUTES } from '@/lib/routes';

const ICON_MAP: Array<{ pattern: RegExp; Icon: LucideIcon }> = [
  { pattern: /needle|syringe/i,              Icon: Syringe },
  { pattern: /ppe|mask|glove|protect/i,      Icon: Shield },
  { pattern: /test|diagnostic|rapid/i,       Icon: FlaskConical },
  { pattern: /suture|surgical|surgery/i,     Icon: Scissors },
  { pattern: /wound|bandage|dress/i,         Icon: Bandage },
  { pattern: /respirat|breath|oxygen|lung/i, Icon: Wind },
  { pattern: /exam|consult|clinic/i,         Icon: Stethoscope },
  { pattern: /mobil|wheelchair|dme|rehab/i,  Icon: Accessibility },
  { pattern: /pill|medic|pharma|drug/i,      Icon: Pill },
  { pattern: /thermo|temperat/i,             Icon: Thermometer },
  { pattern: /micro|lab|specim/i,            Icon: Microscope },
  { pattern: /bone|ortho|spine/i,            Icon: Bone },
  { pattern: /brain|neuro/i,                 Icon: Brain },
  { pattern: /eye|ophthal|vision/i,          Icon: Eye },
  { pattern: /ear|audio|hearing/i,           Icon: Ear },
  { pattern: /heart|cardio|cardiac/i,        Icon: HeartPulse },
  { pattern: /dna|genetic|genomic/i,         Icon: Dna },
  { pattern: /hospital|facilit/i,            Icon: Hospital },
];

function getCategoryIcon(handle: string, title: string): LucideIcon {
  const haystack = `${handle} ${title}`;
  return ICON_MAP.find(({ pattern }) => pattern.test(haystack))?.Icon ?? Package;
}

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
          {collections.map(({ id, title, handle, image }) => (
            <motion.div key={id} variants={itemVariants}>
              <Link
                href={ROUTES.category(handle)}
                className="group bg-white hover:bg-neutral-50 transition-colors flex flex-col items-center justify-center gap-4 py-10 px-4 h-full"
              >
                <div className="w-14 h-14 flex items-center justify-center overflow-hidden">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image.url}
                      alt={image.altText ?? title}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    (() => {
                      const Icon = getCategoryIcon(handle, title);
                      return <Icon size={36} strokeWidth={1.5} className="text-navy-900" />;
                    })()
                  )}
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
