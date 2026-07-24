import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShippingBlock } from '../ShippingBlock'
import type { ShippingDisplay } from '@/lib/shipping-resolver/resolve'

describe('ShippingBlock', () => {
  it('renders nothing when shippingDisplay is null', () => {
    const { container } = render(<ShippingBlock shippingDisplay={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the fallback message for unknown', () => {
    render(
      <ShippingBlock
        shippingDisplay={{ class: 'unknown', message: 'Shipping calculated at checkout.', displayCopy: null }}
      />,
    )
    expect(screen.getByText('Shipping calculated at checkout.')).toBeInTheDocument()
  })

  it('prefers displayCopy over message when both are present', () => {
    render(
      <ShippingBlock
        shippingDisplay={{
          class: 'standard-paid',
          message: 'Shipping calculated at checkout.',
          displayCopy: 'Vendor shipping is $45.95 on orders under $700 and $20.95 on orders of $700 or more. Final shipping is calculated at checkout.',
        }}
      />,
    )
    expect(
      screen.getByText(
        'Vendor shipping is $45.95 on orders under $700 and $20.95 on orders of $700 or more. Final shipping is calculated at checkout.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Shipping calculated at checkout.')).not.toBeInTheDocument()
  })

  it('never states an exact paid rate', () => {
    render(
      <ShippingBlock
        shippingDisplay={{ class: 'standard-paid', message: 'Shipping calculated at checkout.', displayCopy: null }}
      />,
    )
    expect(screen.queryByText(/\$\d/)).not.toBeInTheDocument()
  })
})
