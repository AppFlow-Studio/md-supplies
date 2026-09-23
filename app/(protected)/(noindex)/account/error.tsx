'use client'
import { useState } from 'react'
import { ErrorPage } from '@/components/error/ErrorPage'

export default function AccountError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [supportCode] = useState(() => crypto.randomUUID().slice(0, 8))
  return (
    <ErrorPage
      eyebrow="Something went wrong"
      heading="Account Unavailable"
      body="We couldn't load your account. Please try again or return to the home page."
      onRetry={reset}
      secondaryLabel="Go Home"
      secondaryHref="/"
      supportCode={supportCode}
    />
  )
}
