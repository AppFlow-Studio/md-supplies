import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { AccountView, type Customer, type CustomerOrder } from '../AccountView'

afterEach(cleanup)

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

const customer: Customer = {
  id: 'gid://shopify/Customer/1',
  firstName: 'Jamie',
  lastName: 'Rivera',
  emailAddress: { emailAddress: 'jamie@example.com' },
  phoneNumber: null,
  defaultAddress: null,
}

function order(overrides: Partial<CustomerOrder> = {}): CustomerOrder {
  return {
    id: 'gid://shopify/Order/1',
    number: 3435,
    processedAt: '2026-09-10T00:00:00Z',
    financialStatus: 'PAID',
    fulfillmentStatus: 'FULFILLED',
    totalPrice: { amount: '129.99', currencyCode: 'USD' },
    fulfillments: { nodes: [] },
    ...overrides,
  }
}

// DEV-ACCOUNT-02 (client report, 2026-09-17): Orders #3435/#3436 showed
// "Delivered" on the account dashboard while UPS still had them at "Label
// Created". Proves the Recent Orders table is wired to resolveOrderStatus
// (lib/fulfillment.ts), not a local fulfillmentStatus === 'FULFILLED' map.
describe('AccountView — Recent Orders status badge (DEV-ACCOUNT-02)', () => {
  it('shows "Label Created", not "Delivered", for a FULFILLED order whose shipment only has a UPS label', () => {
    render(
      <AccountView
        customer={customer}
        orders={[order({ fulfillments: { nodes: [{ status: 'SUCCESS', latestShipmentStatus: 'LABEL_PURCHASED', isPickedUp: false }] } })]}
        addresses={[]}
      />,
    )
    expect(screen.getByText('Label Created')).toBeInTheDocument()
    expect(screen.queryByText('Delivered')).not.toBeInTheDocument()
  })

  it('shows "Delivered" only once the shipment actually reports DELIVERED', () => {
    render(
      <AccountView
        customer={customer}
        orders={[order({ fulfillments: { nodes: [{ status: 'SUCCESS', latestShipmentStatus: 'DELIVERED', isPickedUp: false }] } })]}
        addresses={[]}
      />,
    )
    expect(screen.getByText('Delivered')).toBeInTheDocument()
  })

  it('shows "Processing" for an unfulfilled order with no fulfillments', () => {
    render(
      <AccountView
        customer={customer}
        orders={[order({ fulfillmentStatus: 'UNFULFILLED', fulfillments: { nodes: [] } })]}
        addresses={[]}
      />,
    )
    expect(screen.getByText('Processing')).toBeInTheDocument()
  })
})
