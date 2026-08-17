import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { FeaturedProductCard } from '../FeaturedProductCard'

afterEach(cleanup)

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; sizes?: string; priority?: boolean }) => {
    const { fill: _fill, sizes: _sizes, priority: _priority, ...rest } = props
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} />
  },
}))

const baseProduct = {
  handle: 'nitrile-exam-gloves',
  title: 'Nitrile Exam Gloves',
  image: 'https://example.com/gloves.jpg',
  price: 1999,
}

// DEV-RX-02 step 4 / Izzy retest on 225678bc: FeaturedProductCard showed no
// badge at all for an RX product — resolveProductLabels was never wired in.
describe('FeaturedProductCard — label badges (DEV-RX-02)', () => {
  it('shows the Rx Only badge for an RX-tagged product', () => {
    render(
      <FeaturedProductCard
        product={{ ...baseProduct, tags: ['compliance:rx-only'] }}
      />,
    )
    expect(screen.getByText('Rx Only')).toBeInTheDocument()
  })

  it('shows the Rx Only badge from the custom.is_rx_only metafield alone (no tag)', () => {
    render(
      <FeaturedProductCard
        product={{ ...baseProduct, isRxOnly: { value: 'true' } }}
      />,
    )
    expect(screen.getByText('Rx Only')).toBeInTheDocument()
  })

  it('shows the Backorder badge when custom.backorder is true', () => {
    render(
      <FeaturedProductCard
        product={{ ...baseProduct, backorder: { value: 'true' } }}
      />,
    )
    expect(screen.getByText('Backorder')).toBeInTheDocument()
  })

  it('renders no badges for a plain in-stock, non-RX product', () => {
    render(<FeaturedProductCard product={baseProduct} />)
    expect(screen.queryByText('Rx Only')).not.toBeInTheDocument()
    expect(screen.queryByText(/Backorder/)).not.toBeInTheDocument()
  })
})
