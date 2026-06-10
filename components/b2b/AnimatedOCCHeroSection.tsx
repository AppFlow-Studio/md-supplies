"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const ease = [0.22, 1, 0.36, 1] as const;

const textContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const row = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.65, ease } },
};

const imageVariant = {
  hidden: { opacity: 0, x: 40 },
  show:   { opacity: 1, x: 0,  transition: { duration: 0.9, ease, delay: 0.15 } },
};

interface Props {
  title:               string;
  intro:               string;
  programExplanation:  string;
  freeShippingMessage: string;
}

export function AnimatedOCCHeroSection({
  title,
  intro,
  programExplanation,
  freeShippingMessage,
}: Props) {
  return (
    <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 xl:gap-20 relative">

      {/* ── Left: text column ── */}
      <motion.div
        className="lg:max-w-[520px] shrink-0 flex flex-col gap-10"
        variants={textContainer}
        initial="hidden"
        animate="show"
      >
        {/* Breadcrumb */}
        <motion.nav variants={row} aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-[13px] tracking-[0.3px]">
            <li>
              <Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li className="text-gray-500">Solutions</li>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li aria-current="page" className="text-navy-900 font-semibold">OCC</li>
          </ol>
        </motion.nav>

        {/* Headline */}
        <motion.div variants={row} className="flex flex-col gap-5 lg:mb-[25vh]">
          <p className="text-teal-500 text-[13px] font-semibold tracking-[0.75px] uppercase">
            Shop by Industry
          </p>
          <h1 className="text-[44px] sm:text-[56px] font-semibold text-navy-900 leading-[1.05] tracking-tight">
            {title}
          </h1>
          <p className="text-gray-500 text-[16px] leading-[1.7]">{intro}</p>
        </motion.div>

        {/* Program explanation */}
        <motion.div variants={row} className="flex flex-col gap-4 bg-white z-10 p-5 lg:absolute lg:bottom-10 lg:w-[32vw] max-lg:w-full">
          <h2 className="text-[22px] font-bold text-navy-900">
            What is the OCC Program?
          </h2>
          <p className="text-[15px] text-gray-500 leading-[1.65]">
            {programExplanation}
          </p>
          {freeShippingMessage && (
            <div className="flex items-start gap-3 mt-1">
              <span className="text-teal-500 font-bold text-[16px] leading-[1.65] shrink-0">✓</span>
              <p className="text-[15px] text-teal-500 font-medium leading-[1.65]">
                {freeShippingMessage}
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* ── Right: hero image — bleeds to viewport edge on lg–1449px ── */}
      <motion.div
        className="flex-1 min-w-0 relative min-h-[280px] lg:min-h-0 lg:max-[1449px]:-mr-14 overflow-hidden"
        variants={imageVariant}
        initial="hidden"
        animate="show"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/occ-hero.png"
          alt="Healthcare professionals in a modern medical facility"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-y-0 left-0 w-16 bg-linear-to-r from-[#f9fafc] to-transparent pointer-events-none" />
      </motion.div>

    </div>
  );
}
