import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession, isSessionExpiring } from '@/lib/shopify/session'
import { customerFetch } from '@/lib/shopify/customer'
import { GET_CUSTOMER, GET_CUSTOMER_ORDERS, GET_CUSTOMER_ADDRESSES } from '@/lib/shopify/queries/customer'
import { AccountView } from '@/components/account/AccountView'
import type { Customer, CustomerOrder, CustomerAddress } from '@/components/account/AccountView'
import { RxDocumentCard } from '@/components/account/RxDocumentCard'
import { getRxAccountState } from '@/app/actions/rx'
import { getFavoritedProductIds } from '@/app/actions/favorites'

export const metadata: Metadata = {
  title: 'My Account | MD Supplies',
  robots: { index: false, follow: false },
}

export default async function AccountPage() {
  const session = await getSession()

  if (!session) {
    return <AccountView customer={null} orders={[]} addresses={[]} />
  }

  // Token expiring within 60 s — refresh before fetching
  if (isSessionExpiring(session.expiresAt)) {
    redirect('/api/auth/refresh?next=/account')
  }

  let customer: Customer | null
  let orders: CustomerOrder[]
  let ordersHasMore: boolean
  let addresses: CustomerAddress[]

  try {
    const [customerResult, ordersResult, addressesResult] = await Promise.all([
      customerFetch<{ customer: Customer }>(
        GET_CUSTOMER,
        session.accessToken,
      ),
      customerFetch<{ customer: { orders: { nodes: CustomerOrder[]; pageInfo: { hasNextPage: boolean } } } }>(
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

    if (!customerResult.customer) {
      console.warn('[account] API returned customer: null')
    }

    customer = customerResult.customer
    orders = ordersResult.customer.orders.nodes
    ordersHasMore = ordersResult.customer.orders.pageInfo.hasNextPage
    addresses = addressesResult.customer.addresses.nodes
  } catch (err) {
    console.error('[account] customer fetch failed — showing logged-out view:\n', err)
    return <AccountView customer={null} orders={[]} addresses={[]} />
  }

  const rxState = await getRxAccountState()
  const favoritesCount = await getFavoritedProductIds().then((ids) => ids.length).catch(() => 0)

  return (
    <AccountView
      customer={customer}
      orders={orders}
      addresses={addresses}
      ordersHasMore={ordersHasMore}
      favoritesCount={favoritesCount}
      rxCard={
        customer ? (
          <RxDocumentCard hasDocument={rxState.hasDocument} verified={rxState.verified} />
        ) : undefined
      }
    />
  )
}
