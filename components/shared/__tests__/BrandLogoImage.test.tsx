import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { BrandLogoImage } from '../BrandLogoImage'

afterEach(cleanup)

/**
 * P0 (Partners/Brands, 2026-09-04): a brand card must never render a broken-image
 * icon or a blank container — every active card resolves to a valid logo or a
 * clean text fallback (§ Failure-safe rendering contract). These states are the
 * ones the ticket requires covered: valid logo, null logo, broken remote/local
 * logo, textual fallback, and a fixture reproducing the exact Lumex regression
 * (a configured logoFile that 404s from the BunnyCDN proxy at request time).
 */
describe('BrandLogoImage — failure-safe fallback chain', () => {
  it('renders the logo image when a src is given', () => {
    render(<BrandLogoImage src="/api/bunny/brands/3m.svg" name="3M" width={300} height={158} />)
    const img = screen.getByRole('img', { name: '3M logo' })
    expect(img.getAttribute('src')).toBe('/api/bunny/brands/3m.svg')
    expect(img.getAttribute('width')).toBe('300')
    expect(img.getAttribute('height')).toBe('158')
  })

  it('renders a clean text fallback — no <img> at all — when no src is given (null logo)', () => {
    render(<BrandLogoImage src={undefined} name="Some Brand" />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Some Brand')).toBeInTheDocument()
  })

  it('falls back to text after the image fails to load (broken remote/local logo) — never a broken-image icon', () => {
    render(<BrandLogoImage src="/api/bunny/brands/broken.svg" name="Broken Brand" />)
    const img = screen.getByRole('img', { name: 'Broken Brand logo' })

    fireEvent.error(img)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Broken Brand')).toBeInTheDocument()
  })

  it('applies the given fallback className so text contrast/styling stays intact', () => {
    render(
      <BrandLogoImage
        src={undefined}
        name="Styled Brand"
        fallbackClassName="text-center font-bold text-navy-900"
      />,
    )
    expect(screen.getByText('Styled Brand')).toHaveClass('text-center', 'font-bold', 'text-navy-900')
  })

  it('Lumex regression fixture: a configured logoFile that 404s from the proxy still degrades to the clean text fallback, never a blank container', () => {
    // Mirrors lib/brands.ts's real Lumex entry: a src IS configured
    // (/api/bunny/brands/lumex.svg) — the failure only surfaces at request
    // time when the upstream object doesn't resolve, exactly like the
    // production symptom this ticket investigates.
    const { container } = render(<BrandLogoImage src="/api/bunny/brands/lumex.svg" name="Lumex" width={109} height={85} />)

    const img = screen.getByRole('img', { name: 'Lumex logo' })
    expect(img.getAttribute('src')).toBe('/api/bunny/brands/lumex.svg')

    fireEvent.error(img) // simulates the proxy's 404 -> browser onError

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Lumex')).toBeInTheDocument()
    // No empty container: the fallback <span> is the only child, carrying the name.
    expect(container.textContent).toBe('Lumex')
  })
})
