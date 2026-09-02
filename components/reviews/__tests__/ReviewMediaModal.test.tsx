import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { ReviewMediaModal } from '../ReviewMediaModal'
import type { ProductReviewMedia } from '@/lib/trustshop/types'

afterEach(cleanup)

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

const media: ProductReviewMedia[] = [
  { reviewId: 'r1', url: 'https://cdn.example.com/a.jpg', width: 800, height: 600, mediaType: 'image', ratingStar: 5 },
  { reviewId: 'r2', url: 'https://cdn.example.com/b.jpg', width: 800, height: 600, mediaType: 'image', ratingStar: 4 },
]

describe('ReviewMediaModal', () => {
  it('renders as a labeled dialog', () => {
    render(<ReviewMediaModal media={media} startIndex={0} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<ReviewMediaModal media={media} startIndex={0} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('navigates to the next/previous media with arrow keys', () => {
    render(<ReviewMediaModal media={media} startIndex={0} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('link', { name: 'See this review' })).toHaveAttribute('href', '#review-r1')

    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(within(dialog).getByRole('link', { name: 'See this review' })).toHaveAttribute('href', '#review-r2')

    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(within(dialog).getByRole('link', { name: 'See this review' })).toHaveAttribute('href', '#review-r1')
  })

  it('links back to the currently shown media\'s source review', () => {
    render(<ReviewMediaModal media={media} startIndex={1} onClose={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'See this review' })).toHaveAttribute('href', '#review-r2')
  })

  it('returns focus to the previously focused element on unmount', () => {
    const trigger = document.createElement('button')
    trigger.textContent = 'Open media'
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    const { unmount } = render(<ReviewMediaModal media={media} startIndex={0} onClose={vi.fn()} />)
    expect(document.activeElement).not.toBe(trigger)

    unmount()
    expect(document.activeElement).toBe(trigger)
    document.body.removeChild(trigger)
  })

  it('close button has type=button', () => {
    render(<ReviewMediaModal media={media} startIndex={0} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Close' })).toHaveAttribute('type', 'button')
  })
})
