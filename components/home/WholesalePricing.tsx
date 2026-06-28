"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { buildFormSubmitEvent } from '@/lib/analytics/events'
import { submitForm } from '@/lib/forms/submit'
import { FACILITY_TYPES } from '@/lib/forms/schema'

const BENEFITS = [
  "Product availability support",
  "Packaging and quantity guidance",
  "Item number / brand confirmation",
  "Reliable ordering assistance",
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
    website: "", // honeypot — must stay empty
  });
  const [status, setStatus] = useState<Status>('idle')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting')
    setFieldErrors({})
    setServerError(null)

    // Only enum/non-PII detail is sent to analytics — never name/email/phone.
    const result = await submitForm({
      url: '/api/sourcing',
      payload: form,
      analyticsEvent: buildFormSubmitEvent({
        formName: 'sourcing_request',
        details: { faculty_type: form.facultyType },
      }),
    })

    if (result.ok) {
      setStatus('success')
      return
    }

    // Preserve the user's input for retry; surface what went wrong.
    setStatus('error')
    setFieldErrors(result.fields ?? {})
    if (!result.fields) {
      setServerError('Something went wrong. Please try again or email us directly.')
    }
  }

  return (
    <section id="wholesale-sourcing" className="w-full bg-neutral-50 overflow-hidden relative">
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
              <label htmlFor="sourcing-name" className="text-[15px] font-medium text-gray-500 tracking-[0.06em] uppercase">
                Faculty Name
              </label>
              <input
                id="sourcing-name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? 'sourcing-name-error' : undefined}
                className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors placeholder:text-gray-200"
                placeholder="Dr. Jane Smith"
              />
              {fieldErrors.name && (
                <p id="sourcing-name-error" className="text-red-600 text-[13px]">{fieldErrors.name}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="sourcing-email" className="text-[15px] font-medium text-gray-500 tracking-[0.06em] uppercase">
                Your Email
              </label>
              <input
                id="sourcing-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'sourcing-email-error' : undefined}
                className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors placeholder:text-gray-200"
                placeholder="jane@clinic.com"
              />
              {fieldErrors.email && (
                <p id="sourcing-email-error" className="text-red-600 text-[13px]">{fieldErrors.email}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="sourcing-phone" className="text-[15px] font-medium text-gray-500 tracking-[0.06em] uppercase">
                Phone Number
              </label>
              <input
                id="sourcing-phone"
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                aria-invalid={!!fieldErrors.phone}
                aria-describedby={fieldErrors.phone ? 'sourcing-phone-error' : undefined}
                className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors placeholder:text-gray-200"
                placeholder="+1 (555) 000-0000"
              />
              {fieldErrors.phone && (
                <p id="sourcing-phone-error" className="text-red-600 text-[13px]">{fieldErrors.phone}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="sourcing-faculty" className="text-[15px] font-medium text-gray-500 tracking-[0.06em] uppercase">
                Select Faculty Type
              </label>
              <select
                id="sourcing-faculty"
                name="facultyType"
                value={form.facultyType}
                onChange={handleChange}
                required
                aria-invalid={!!fieldErrors.facultyType}
                aria-describedby={fieldErrors.facultyType ? 'sourcing-faculty-error' : undefined}
                className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors appearance-none cursor-pointer"
              >
                <option value="" disabled>Choose a type…</option>
                {FACILITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {fieldErrors.facultyType && (
                <p id="sourcing-faculty-error" className="text-red-600 text-[13px]">{fieldErrors.facultyType}</p>
              )}
            </div>

            {/* Honeypot — hidden from real users; bots that fill it are dropped. */}
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={handleChange}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute left-[-9999px] top-[-9999px] h-0 w-0 opacity-0"
            />

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
                {status === 'error' && (serverError || Object.keys(fieldErrors).length > 0) && (
                  <p role="alert" className="text-red-600 text-[13px] text-center">
                    {serverError ?? 'Please correct the highlighted fields and try again.'}
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
