import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import React from 'react'
import { ErrorPage } from '../ErrorPage'

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

afterEach(() => {
  cleanup()
})

const defaultProps = {
  eyebrow: 'Something went wrong',
  heading: 'Page Failed',
  body: 'Please try again.',
  onRetry: vi.fn(),
  secondaryLabel: 'Go Home',
  secondaryHref: '/',
  supportCode: 'abc-1234',
}

describe('ErrorPage', () => {
  it('renders eyebrow, heading, and body text', () => {
    render(<ErrorPage {...defaultProps} />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Page Failed' })).toBeInTheDocument()
    expect(screen.getByText('Please try again.')).toBeInTheDocument()
  })

  it('calls onRetry when Try Again button is clicked', () => {
    const onRetry = vi.fn()
    render(<ErrorPage {...defaultProps} onRetry={onRetry} />)
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders secondary link with correct href and label', () => {
    render(<ErrorPage {...defaultProps} />)
    const link = screen.getByRole('link', { name: 'Go Home' })
    expect(link).toHaveAttribute('href', '/')
  })

  it('displays the support code', () => {
    render(<ErrorPage {...defaultProps} />)
    expect(screen.getByText(/abc-1234/)).toBeInTheDocument()
  })
})
