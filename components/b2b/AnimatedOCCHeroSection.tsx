"use client";

import { motion } from "framer-motion";

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
  description:         string;
  programExplanation:  string;
  freeShippingMessage: string;
}

export function AnimatedOCCHeroSection({
  title,
  description,
  programExplanation,
  freeShippingMessage,
}: Props) {
  return (
    <div className="flex flex-col gap-0">

      {/* ── Hero row: text + image ── */}
      <div className="flex flex-col lg:flex-row">

        {/* Left: text column */}
        <motion.div
          className="lg:w-[50%] shrink-0 flex flex-col gap-5 lg:gap-6 pb-8 lg:pb-10"
          variants={textContainer}
          initial="hidden"
          animate="show"
        >
          <motion.p variants={row} className="text-[#0086b1] text-[15px] font-semibold tracking-[0.3px] uppercase">
            Operation Christmas Child
          </motion.p>

          <motion.h1 variants={row} className="text-[44px] sm:text-[50px] font-semibold text-navy-900 leading-[1.2] tracking-tight">
            {title}
          </motion.h1>

          <motion.p variants={row} className="text-[18px] font-medium text-[#666664] leading-[30px]">
            {description}
          </motion.p>
        </motion.div>

        {/* Right: hero image */}
        <motion.div
          className="flex-1 min-w-0 relative min-h-[300px] lg:min-h-[420px] lg:max-[1449px]:-mr-14 overflow-hidden"
          variants={imageVariant}
          initial="hidden"
          animate="show"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/occ-hero.png"
            alt="Volunteers packing Operation Christmas Child shoebox gifts"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </motion.div>

      </div>

      {/* ── Program explanation card — flows below hero, no absolute positioning ── */}
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease, delay: 0.45 }}
        className="flex flex-col gap-5 bg-white px-8 py-8 lg:px-10 w-full lg:w-[60%] lg:-mt-16"
      >
        <h2 className="text-[30px] font-bold text-navy-900 tracking-[0.6px]">
          About the OCC Collection
        </h2>
        <p className="text-[18px] text-[#666664] font-medium leading-[30px]">
          {programExplanation}
        </p>
        {freeShippingMessage && (
          <div className="flex items-start gap-3">
            <span className="text-[#4badcd] font-bold text-[16px] leading-[1.65] shrink-0">✓</span>
            <p className="text-[16px] text-[#4badcd] font-semibold leading-[1.65]">
              {freeShippingMessage}
            </p>
          </div>
        )}
      </motion.div>

    </div>
  );
}
