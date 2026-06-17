'use client'

import { useState } from 'react'

type Status = 'idle' | 'submitting' | 'success' | 'error'

const SUBJECTS = [
  'General inquiry',
  'Product availability',
  'Wholesale / B2B pricing',
  'Order support',
  'Returns & refunds',
  'Other',
]

export function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [status, setStatus] = useState<Status>('idle')

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('server')
      setStatus('success')
      const w = window as unknown as { gtag?: (...args: unknown[]) => void }
      if (typeof w.gtag === 'function') {
        w.gtag('event', 'form_submit', { form_name: 'contact', subject: form.subject || 'none' })
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-teal-50 border border-teal-300 text-teal-800 text-[15px] font-medium py-6 px-8">
        Message received — we&apos;ll be in touch within one business day.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-[13px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          placeholder="Dr. Jane Smith"
          className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors placeholder:text-gray-300"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[13px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          placeholder="jane@clinic.com"
          className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors placeholder:text-gray-300"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="subject" className="text-[13px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
          Subject
        </label>
        <select
          id="subject"
          name="subject"
          value={form.subject}
          onChange={handleChange}
          className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors appearance-none cursor-pointer"
        >
          <option value="">Choose a subject…</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-[13px] font-semibold text-gray-500 uppercase tracking-[0.06em]">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          value={form.message}
          onChange={handleChange}
          required
          rows={5}
          placeholder="Tell us how we can help…"
          className="border border-navy-900/20 bg-white py-3 px-4 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors placeholder:text-gray-300 resize-none"
        />
      </div>

      {status === 'error' && (
        <p className="text-red-600 text-[13px]">
          Something went wrong. Please try again or email us directly.
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="self-start bg-navy-900 text-white text-[16px] font-semibold px-10 py-4 hover:bg-navy-950 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'submitting' ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  )
}
