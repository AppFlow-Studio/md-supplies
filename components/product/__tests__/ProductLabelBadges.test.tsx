import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ProductLabelBadges } from '../ProductLabelBadges'
import { resolveProductLabels } from '@/lib/labels/labels'

afterEach(cleanup)

// DEV-SHIP-04: the one place that guarantees RX -> Backorder -> Free
// Shipping order across every surface (cards, PDP, quick add, cart). This
// exercises all three together end to end (resolveProductLabels for RX +
// Backorder, a resolver-confirmed shippingDisplay for Free Shipping) so a
// future change to either sort order cannot silently drift.
describe('ProductLabelBadges — RX + Backorder + Free Shipping order', () => {
  it('renders all three badges in RX -> Backorder -> Free Shipping order', () => {
    const labels = resolveProductLabels({
      tags: ['compliance:rx-only'],
      isBackordered: true,
    })
    render(
      <ProductLabelBadges
        labels={labels}
        shippingDisplay={{ class: 'standard-free', message: 'Free shipping', displayCopy: null }}
      />,
    )

    const badges = screen.getAllByText(/^(Rx Only|Backorder|Free Shipping)$/)
    expect(badges.map((el) => el.textContent)).toEqual(['Rx Only', 'Backorder', 'Free Shipping'])
  })

  it('keeps RX -> Free Shipping order with Backorder absent', () => {
    const labels = resolveProductLabels({ tags: ['compliance:rx-only'], isBackordered: false })
    render(
      <ProductLabelBadges
        labels={labels}
        shippingDisplay={{ class: 'standard-free', message: 'Free shipping', displayCopy: null }}
      />,
    )
    const badges = screen.getAllByText(/^(Rx Only|Backorder|Free Shipping)$/)
    expect(badges.map((el) => el.textContent)).toEqual(['Rx Only', 'Free Shipping'])
  })
})
