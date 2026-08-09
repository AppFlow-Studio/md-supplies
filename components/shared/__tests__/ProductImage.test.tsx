import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ProductImage } from '../ProductImage'
import { GLOBAL_PRODUCT_PLACEHOLDER } from '@/lib/bunnycdn'

afterEach(cleanup)

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; sizes?: string; priority?: boolean }) => {
    const { fill: _fill, sizes: _sizes, priority: _priority, ...rest } = props
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} />
  },
}))

/**
 * DEV-LAUNCH-07: a missing image must never render a broken-image icon or a
 * blank card — the fallback chain (real image → category placeholder →
 * global placeholder → neutral div) is the "missing image" state this
 * ticket's acceptance criteria require to "remain visually complete."
 */
describe('ProductImage — missing-image fallback chain', () => {
  it('goes straight to the category placeholder when no src is given', () => {
    render(<ProductImage src={null} alt="Gloves" categoryHandle="gloves" />)
    const img = screen.getByRole('img', { name: 'Gloves' })
    expect(img.getAttribute('src')).toContain('/api/bunny/categories/')
  })

  it('falls through to the global placeholder when the category placeholder also fails', () => {
    render(<ProductImage src={null} alt="Gloves" categoryHandle="gloves" />)
    const img = screen.getByRole('img', { name: 'Gloves' })
    fireEvent.error(img)

    const fallback = screen.getByRole('img', { name: 'Gloves' })
    expect(fallback.getAttribute('src')).toBe(GLOBAL_PRODUCT_PLACEHOLDER)
  })

  it('renders a neutral block — never a broken-image icon — once every fallback has failed', () => {
    const { container } = render(<ProductImage src="https://example.com/broken.jpg" alt="Gloves" categoryHandle="gloves" />)

    fireEvent.error(screen.getByRole('img', { name: 'Gloves' })) // real image fails
    fireEvent.error(screen.getByRole('img', { name: 'Gloves' })) // category placeholder fails
    fireEvent.error(screen.getByRole('img', { name: 'Gloves' })) // global placeholder fails

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('div.bg-neutral-50')).toBeInTheDocument()
  })
})
