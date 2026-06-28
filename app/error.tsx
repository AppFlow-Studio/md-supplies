'use client'
import { useState } from 'react'
import { ErrorPage } from '@/components/error/ErrorPage'

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [supportCode] = useState(() => crypto.randomUUID().slice(0, 8))
  return (
    <ErrorPage
      eyebrow="Something went wrong"
      heading="Page Failed to Load"
      body="An unexpected error occurred. Please try again or browse our categories."
      onRetry={reset}
      secondaryLabel="Browse Categories"
      secondaryHref="/categories"
      supportCode={supportCode}
    />
  )
}
