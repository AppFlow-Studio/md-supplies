'use client'
import { useState } from 'react'
import { ErrorPage } from '@/components/error/ErrorPage'

export default function ProductError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [supportCode] = useState(() => crypto.randomUUID().slice(0, 8))
  return (
    <ErrorPage
      eyebrow="Something went wrong"
      heading="Product Unavailable"
      body="We couldn't load this product. Please try again or browse our categories."
      onRetry={reset}
      secondaryLabel="Browse Categories"
      secondaryHref="/categories"
      supportCode={supportCode}
    />
  )
}
