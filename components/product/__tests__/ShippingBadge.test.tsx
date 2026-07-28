import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ShippingBadge } from '../ShippingBadge'
import type { ShippingDisplay } from '@/lib/shipping-resolver/resolve'

function display(overrides: Partial<ShippingDisplay> = {}): ShippingDisplay {
  return { class: 'standard-free', message: 'Free shipping', displayCopy: null, ...overrides }
}

afterEach(cleanup)

describe('ShippingBadge', () => {
  it('renders nothing when shippingDisplay is null', () => {
    const { container } = render(<ShippingBadge shippingDisplay={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a "Free Shipping" badge for standard-free', () => {
    render(<ShippingBadge shippingDisplay={display({ class: 'standard-free' })} />)
    expect(screen.getByText('Free Shipping')).toBeInTheDocument()
  })

  it('renders nothing for threshold — the condition is unstated, so the badge would over-promise', () => {
    // A threshold product only ships free once a subtotal condition is met. A
    // badge has no room to say so, and the wording is not approved: the tested
    // rule fires at exactly $30 (>=), and the confirmed policy covers only
    // merchandise Dukal actually fulfils, which this resolver cannot yet tell.
    const { container } = render(<ShippingBadge shippingDisplay={display({ class: 'threshold' })} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for standard-paid', () => {
    const { container } = render(<ShippingBadge shippingDisplay={display({ class: 'standard-paid' })} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for unknown — the 17 unsafe-FREE variants must never show a badge', () => {
    const { container } = render(<ShippingBadge shippingDisplay={display({ class: 'unknown' })} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for manual-quote', () => {
    const { container } = render(<ShippingBadge shippingDisplay={display({ class: 'manual-quote' })} />)
    expect(container).toBeEmptyDOMElement()
  })
})
