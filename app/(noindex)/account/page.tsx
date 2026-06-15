import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/shopify/session'
import { customerFetch } from '@/lib/shopify/customer'
import { GET_CUSTOMER, GET_CUSTOMER_ORDERS, GET_CUSTOMER_ADDRESSES } from '@/lib/shopify/queries/customer'
import { AccountView } from '@/components/account/AccountView'
import type { Customer, CustomerOrder, CustomerAddress } from '@/components/account/AccountView'

export const metadata: Metadata = {
  title: 'My Account | MD Supplies',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const session = await getSession()

  if (!session) {
    return <AccountView customer={null} orders={[]} addresses={[]} />
  }

  // Token expiring within 60 s — refresh before fetching
  if (Date.now() >= session.expiresAt - 60_000) {
    redirect('/api/auth/refresh?next=/account')
  }

  try {
    const [customerResult, ordersResult, addressesResult] = await Promise.all([
      customerFetch<{ customer: Customer }>(
        GET_CUSTOMER,
        session.accessToken,
      ),
      customerFetch<{ customer: { orders: { nodes: CustomerOrder[] } } }>(
        GET_CUSTOMER_ORDERS,
        session.accessToken,
        { first: 10 },
      ),
      customerFetch<{ customer: { addresses: { nodes: CustomerAddress[] } } }>(
        GET_CUSTOMER_ADDRESSES,
        session.accessToken,
        { first: 20 },
      ),
    ])

    // DEBUG (temporary): 200 OK but customer null = token valid yet no customer returned
    if (!customerResult.customer) {
      console.warn('[account] API returned customer: null (token prefix:', session.accessToken.slice(0, 9), ')')
    }

    return (
      <AccountView
        customer={customerResult.customer}
        orders={ordersResult.customer.orders.nodes}
        addresses={addressesResult.customer.addresses.nodes}
      />
    )
  } catch (err) {
    // DEBUG (temporary): log instead of silently swallowing
    console.error('[account] customer fetch failed — showing logged-out view:\n', err)
    return <AccountView customer={null} orders={[]} addresses={[]} />
  }
}
