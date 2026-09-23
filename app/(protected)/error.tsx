'use client'
import { useState } from 'react'
import { ErrorPage } from '@/components/error/ErrorPage'

// This group's own root (app/(protected)/layout.tsx) has no ancestor in
// common with app/(site)/error.tsx, so it needs its own copy of this
// boundary — otherwise an uncaught error under /search would skip straight
// to the bare app/global-error.tsx fallback instead of this ErrorPage UI.
export default function ProtectedError({
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
