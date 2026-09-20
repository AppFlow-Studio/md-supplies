'use client'
import { useState } from 'react'
import { ErrorPage } from '@/components/error/ErrorPage'

export default function CategoryError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [supportCode] = useState(() => crypto.randomUUID().slice(0, 8))
  return (
    <ErrorPage
      eyebrow="Something went wrong"
      heading="Category Unavailable"
      body="We couldn't load this category. Please try again or view all categories."
      onRetry={reset}
      secondaryLabel="All Categories"
      secondaryHref="/categories"
      supportCode={supportCode}
    />
  )
}
