'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [supportCode] = useState(() => crypto.randomUUID().slice(0, 8))

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#f9fafc]">
        <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <p className="text-teal-500 text-[15px] font-semibold tracking-[0.75px] uppercase mb-4">
            Something went wrong
          </p>
          <h1 className="text-navy-900 text-[60px] sm:text-[80px] font-bold leading-none mb-4">
            Unexpected Error
          </h1>
          <p className="text-gray-500 text-[18px] max-w-[480px] leading-[1.65] mb-10">
            A critical error occurred. Please refresh the page or return home.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={reset}
              className="bg-navy-900 text-white text-[18px] font-semibold px-8 h-[56px] flex items-center justify-center hover:bg-navy-950 transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="border border-navy-900 text-navy-900 text-[18px] font-semibold px-8 h-[56px] flex items-center justify-center hover:bg-neutral-50 transition-colors"
            >
              Go Home
            </Link>
          </div>
          <p className="text-gray-400 text-[12px] mt-8">
            Support code: {supportCode}
          </p>
        </main>
      </body>
    </html>
  )
}
