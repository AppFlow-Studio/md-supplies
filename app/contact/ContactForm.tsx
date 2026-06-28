'use client'

import { useState } from 'react'
import { buildFormSubmitEvent } from '@/lib/analytics/events'
import { submitForm } from '@/lib/forms/submit'
import { SUBJECTS } from '@/lib/forms/schema'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' })
  const [status, setStatus] = useState<Status>('idle')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setFieldErrors({})
    setServerError(null)

    // Only the non-PII subject is sent to analytics — never name/email/message.
    const result = await submitForm({
      url: '/api/contact',
      payload: form,
      analyticsEvent: buildFormSubmitEvent({
        formName: 'contact',
        details: { subject: form.subject || 'none' },
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
          aria-invalid={!!fieldErrors.name}
          aria-describedby={fieldErrors.name ? 'name-error' : undefined}
          placeholder="Dr. Jane Smith"
          className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors placeholder:text-gray-300"
        />
        {fieldErrors.name && <p id="name-error" className="text-red-600 text-[13px]">{fieldErrors.name}</p>}
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
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          placeholder="jane@clinic.com"
          className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors placeholder:text-gray-300"
        />
        {fieldErrors.email && <p id="email-error" className="text-red-600 text-[13px]">{fieldErrors.email}</p>}
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
          aria-invalid={!!fieldErrors.message}
          aria-describedby={fieldErrors.message ? 'message-error' : undefined}
          placeholder="Tell us how we can help…"
          className="border border-navy-900/20 bg-white py-3 px-4 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors placeholder:text-gray-300 resize-none"
        />
        {fieldErrors.message && <p id="message-error" className="text-red-600 text-[13px]">{fieldErrors.message}</p>}
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

      {status === 'error' && (serverError || Object.keys(fieldErrors).length > 0) && (
        <p role="alert" className="text-red-600 text-[13px]">
          {serverError ?? 'Please correct the highlighted fields and try again.'}
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
