'use client'

import { useEffect, useRef, useState } from 'react'
import { Star } from 'lucide-react'
import { submitForm } from '@/lib/forms/submit'

type Status = 'idle' | 'submitting' | 'success' | 'error'

const MAX_CONTENT = 4000

/**
 * Store-review write form — deliberately parallel to WriteProductReview.tsx
 * (same guard/validation contract via /api/reviews/store) but no
 * productGid field at all, and copy asks about the shopping experience,
 * not a specific product.
 */
export function WriteStoreReview() {
  const [star, setStar] = useState(0)
  const [hoverStar, setHoverStar] = useState(0)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const mountedAt = useRef(0)
  useEffect(() => {
    if (mountedAt.current === 0) mountedAt.current = Date.now()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (star < 1) {
      setFieldErrors({ star: 'Choose a rating' })
      return
    }

    setStatus('submitting')
    setFieldErrors({})
    setServerError(null)

    const result = await submitForm({
      url: '/api/reviews/store',
      payload: {
        star,
        title: title.trim() || undefined,
        content,
        name,
        email,
        website,
        elapsedMs: Date.now() - mountedAt.current,
      },
    })

    if (result.ok) {
      setStatus('success')
      setStar(0)
      setTitle('')
      setContent('')
      setName('')
      setEmail('')
      return
    }

    // Never clear typed content on failure — only on confirmed success above.
    setStatus('error')
    setFieldErrors(result.fields ?? {})
    if (!result.fields) {
      setServerError(result.error ?? 'Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div
        id="write-a-store-review"
        role="status"
        className="bg-teal-50 border border-teal-300 text-teal-800 text-[15px] font-medium py-6 px-6 text-center scroll-mt-[140px]"
      >
        Thanks — your experience has been submitted for approval.
      </div>
    )
  }

  return (
    <form id="write-a-store-review" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 max-w-[520px] scroll-mt-[140px]">
      <div>
        <h3 className="text-navy-900 text-[20px] font-semibold">Share Your Experience</h3>
        <p className="text-gray-500 text-[13px] mt-1">Tell us how your experience shopping with MD Supplies has been.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span id="store-review-star-label" className="text-[13px] font-medium text-gray-500 tracking-[0.06em] uppercase">
          Your Rating
        </span>
        <div role="radiogroup" aria-labelledby="store-review-star-label" className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={star === n}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              onMouseEnter={() => setHoverStar(n)}
              onMouseLeave={() => setHoverStar(0)}
              onFocus={() => setHoverStar(n)}
              onBlur={() => setHoverStar(0)}
              onClick={() => setStar(n)}
              className="p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-900"
            >
              <Star
                size={26}
                className={(hoverStar || star) >= n ? 'text-amber-400' : 'text-gray-200'}
                fill="currentColor"
                strokeWidth={0}
              />
            </button>
          ))}
        </div>
        {fieldErrors.star && <p className="text-red-600 text-[13px]">{fieldErrors.star}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="store-review-title" className="text-[13px] font-medium text-gray-500 tracking-[0.06em] uppercase">
          Title (optional)
        </label>
        <input
          id="store-review-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          aria-invalid={!!fieldErrors.title}
          aria-describedby={fieldErrors.title ? 'store-review-title-error' : undefined}
          className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors"
        />
        {fieldErrors.title && <p id="store-review-title-error" className="text-red-600 text-[13px]">{fieldErrors.title}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="store-review-content" className="text-[13px] font-medium text-gray-500 tracking-[0.06em] uppercase">
          Your Experience
        </label>
        <textarea
          id="store-review-content"
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT))}
          required
          rows={5}
          maxLength={MAX_CONTENT}
          aria-invalid={!!fieldErrors.content}
          aria-describedby={fieldErrors.content ? 'store-review-content-error' : 'store-review-content-count'}
          className="border border-gray-200 bg-transparent p-3 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors resize-y"
        />
        <span id="store-review-content-count" className="text-gray-500 text-[12px]">{content.length}/{MAX_CONTENT}</span>
        {fieldErrors.content && <p id="store-review-content-error" className="text-red-600 text-[13px]">{fieldErrors.content}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="store-review-name" className="text-[13px] font-medium text-gray-500 tracking-[0.06em] uppercase">
          Your Name
        </label>
        <input
          id="store-review-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          aria-invalid={!!fieldErrors.name}
          aria-describedby={fieldErrors.name ? 'store-review-name-error' : undefined}
          className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors"
        />
        {fieldErrors.name && <p id="store-review-name-error" className="text-red-600 text-[13px]">{fieldErrors.name}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="store-review-email" className="text-[13px] font-medium text-gray-500 tracking-[0.06em] uppercase">
          Your Email
        </label>
        <input
          id="store-review-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? 'store-review-email-error' : undefined}
          className="border-0 border-b border-navy-900 bg-transparent py-2 text-[15px] text-navy-900 outline-none focus:border-teal-500 transition-colors"
        />
        {fieldErrors.email && <p id="store-review-email-error" className="text-red-600 text-[13px]">{fieldErrors.email}</p>}
        <p className="text-gray-500 text-[12px]">Never published. Used only to verify your review.</p>
      </div>

      {/* Honeypot — hidden from real users; bots that fill it are dropped. */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] top-[-9999px] h-0 w-0 opacity-0"
      />

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="bg-navy-900 text-white text-[15px] font-semibold tracking-[0.04em] py-3 hover:bg-navy-950 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === 'submitting' ? 'SUBMITTING…' : 'SUBMIT REVIEW'}
      </button>

      {status === 'error' && (serverError || Object.keys(fieldErrors).length > 0) && (
        <p role="alert" className="text-red-600 text-[13px]">
          {serverError ?? 'Please correct the highlighted fields and try again.'}
        </p>
      )}
    </form>
  )
}
