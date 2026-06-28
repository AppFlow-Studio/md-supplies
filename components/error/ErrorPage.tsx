'use client'
import Link from 'next/link'

interface ErrorPageProps {
  eyebrow: string
  heading: string
  body: string
  onRetry: () => void
  secondaryLabel: string
  secondaryHref: string
  supportCode: string
}

export function ErrorPage({
  eyebrow,
  heading,
  body,
  onRetry,
  secondaryLabel,
  secondaryHref,
  supportCode,
}: ErrorPageProps) {
  return (
    <main className="bg-[#f9fafc] min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-teal-500 text-[15px] font-semibold tracking-[0.75px] uppercase mb-4">
        {eyebrow}
      </p>
      <h1 className="text-navy-900 text-[60px] sm:text-[80px] font-bold leading-none mb-4">
        {heading}
      </h1>
      <p className="text-gray-500 text-[18px] max-w-[480px] leading-[1.65] mb-10">
        {body}
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onRetry}
          className="bg-navy-900 text-white text-[18px] font-semibold px-8 h-[56px] flex items-center justify-center hover:bg-navy-950 transition-colors"
        >
          Try Again
        </button>
        <Link
          href={secondaryHref}
          className="border border-navy-900 text-navy-900 text-[18px] font-semibold px-8 h-[56px] flex items-center justify-center hover:bg-neutral-50 transition-colors"
        >
          {secondaryLabel}
        </Link>
      </div>
      <p className="text-gray-400 text-[12px] mt-8">
        Support code: {supportCode}
      </p>
    </main>
  )
}
