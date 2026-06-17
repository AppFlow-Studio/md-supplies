"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

const BENEFITS = [
  "Product availability support",
  "Packaging and quantity guidance",
  "Item number / brand confirmation",
  "Reliable ordering assistance",
];

const FACULTY_TYPES = [
  "Urgent Care Center",
  "Hospital / Health System",
  "HRT / Wellness Clinic",
  "Home Care Agency",
  "EMS / First Responder",
  "Pharmacy",
  "Physical Therapy",
  "Other",
];

const leftContainerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const leftItemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function WholesalePricing() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    facultyType: "",
  });
  const [status, setStatus] = useState<Status>('idle')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting')
    try {
      await fetch('/api/sourcing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setStatus('success')
      const w = window as unknown as { gtag?: (...args: unknown[]) => void }
      if (typeof w.gtag === 'function') {
        w.gtag('event', 'form_submit', { form_name: 'sourcing_request', faculty_type: form.facultyType })
      }
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="w-full bg-neutral-50 overflow-hidden relative">
      <div className="mx-auto flex flex-col lg:flex-row min-h-[580px]">

        {/* ── Left: teal panel ── */}
        <motion.div
          className="bg-teal-500 flex-1 px-8 sm:px-12 lg:px-16 py-14 md:py-32 flex flex-col justify-center gap-6"
          variants={leftContainerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          <motion.div variants={leftItemVariants} className="inline-flex items-center self-start bg-[rgba(0,193,255,0.2)] rounded-full px-4 py-2">
            <span className="text-[13px] font-semibold tracking-[0.06em] text-white uppercase">
              For Healthcare Professionals
            </span>
          </motion.div>

          <motion.h2 variants={leftItemVariants} className="text-[38px] sm:text-[45px] font-bold text-white leading-[1.15] tracking-[0.9px] max-w-[460px]">
            Need Help Sourcing Medical Supplies?
          </motion.h2>

          <motion.p variants={leftItemVariants} className="text-white text-[15px] font-normal leading-[1.9] max-w-[490px]">
            Tell us what you’re looking for and our team will help confirm product availability, packaging options, item details, and the best ordering path for your needs.
          </motion.p>

          <motion.ul variants={leftItemVariants} className="flex flex-col gap-3">
            {BENEFITS.map((item) => (
              <li key={item} className="flex items-center gap-3 text-white text-[15px]">
                <Check size={12} className="shrink-0 text-white" strokeWidth={3} />
                {item}
              </li>
            ))}
          </motion.ul>
        </motion.div>
        {/* Spacer — desktop only, reserves room for the absolute form */}
        <div className="hidden lg:block w-[40%] shrink-0" />

        {/* ── Right: form panel ── */}
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.2 }}
          viewport={{ once: true }}
          className="bg-white w-full px-8 sm:px-12 py-14
                     lg:absolute lg:top-1/2 lg:-translate-y-1/2 lg:right-[8%] lg:w-[560px] lg:px-14 lg:py-16
                     xl:w-[642px]
                     flex flex-col justify-center"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-medium text-gray-500 tracking-[0.06em] uppercase">
                Faculty Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors placeholder:text-gray-200"
                placeholder="Dr. Jane Smith"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-medium text-gray-500 tracking-[0.06em] uppercase">
                Your Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors placeholder:text-gray-200"
                placeholder="jane@clinic.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-medium text-gray-500 tracking-[0.06em] uppercase">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors placeholder:text-gray-200"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[15px] font-medium text-gray-500 tracking-[0.06em] uppercase">
                Select Faculty Type
              </label>
              <select
                name="facultyType"
                value={form.facultyType}
                onChange={handleChange}
                required
                className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors appearance-none cursor-pointer"
              >
                <option value="" disabled>Choose a type…</option>
                {FACULTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {status === 'success' ? (
              <div className="mt-2 bg-teal-50 border border-teal-300 text-teal-800 text-[15px] font-medium py-5 px-6 text-center">
                Application submitted — we&apos;ll be in touch shortly.
              </div>
            ) : (
              <>
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="mt-2 bg-navy-900 text-white text-[18px] font-semibold tracking-[0.04em] py-4 hover:bg-navy-950 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === 'submitting' ? 'SUBMITTING…' : 'SUBMIT APPLICATION'}
                </button>
                {status === 'error' && (
                  <p className="text-red-600 text-[13px] text-center">
                    Something went wrong. Please try again or email us directly.
                  </p>
                )}
              </>
            )}

          </form>
        </motion.div>

      </div>
    </section>
  );
}
