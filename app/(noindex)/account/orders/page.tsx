import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getSession, isSessionExpiring } from '@/lib/shopify/session'
import { customerFetch } from '@/lib/shopify/customer'
import { GET_CUSTOMER_ORDERS } from '@/lib/shopify/queries/customer'
import type { CustomerOrder } from '@/components/account/AccountView'

export const metadata: Metadata = {
  title: 'Order History | MD Supplies',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatPrice(amount: string, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: currencyCode,
  }).format(parseFloat(amount))
}

function getFulfillmentDisplay(status: string): { label: string; style: string } {
  switch (status) {
    case 'FULFILLED':           return { label: 'Delivered',  style: 'bg-green-100 text-green-700'   }
    case 'IN_PROGRESS':         return { label: 'Shipped',    style: 'bg-blue-100 text-blue-700'     }
    case 'PARTIALLY_FULFILLED': return { label: 'Partial',    style: 'bg-blue-100 text-blue-700'     }
    default:                    return { label: 'Processing', style: 'bg-yellow-100 text-yellow-700' }
  }
}

export default async function AccountOrdersPage() {
  const session = await getSession()
  if (!session) redirect('/api/auth/login')

  if (isSessionExpiring(session.expiresAt)) {
    redirect('/api/auth/refresh?next=/account/orders')
  }

  let orders: CustomerOrder[] = []

  try {
    const result = await customerFetch<{ customer: { orders: { nodes: CustomerOrder[] } } }>(
      GET_CUSTOMER_ORDERS,
      session.accessToken,
      { first: 50 },
    )
    orders = result.customer.orders.nodes
  } catch {
    redirect('/api/auth/login')
  }

  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
        <Link
          href="/account"
          className="inline-flex items-center gap-1 text-gray-500 text-[14px] hover:text-navy-900 transition-colors mb-6"
        >
          <ChevronLeft size={14} />
          Back to Account
        </Link>

        <h1 className="text-navy-900 text-[32px] font-semibold mb-8">Order History</h1>

        <div className="bg-white">
          {orders.length === 0 ? (
            <p className="px-8 py-12 text-gray-500 text-[15px]">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    {['Order #', 'Date', 'Status', 'Total', ''].map((h) => (
                      <th
                        key={h}
                        className="px-8 py-4 text-left text-[12px] font-semibold text-gray-500 uppercase tracking-[0.3px]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, i) => {
                    const { label: statusLabel, style: statusStyle } = getFulfillmentDisplay(order.fulfillmentStatus)
                    return (
                      <tr key={order.id} className={i < orders.length - 1 ? 'border-b border-gray-200' : ''}>
                        <td className="px-8 py-5 text-navy-900 text-[15px] font-semibold">#{order.number}</td>
                        <td className="px-8 py-5 text-gray-500 text-[15px]">{formatDate(order.processedAt)}</td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex px-3 py-1 text-[12px] font-semibold rounded-full ${statusStyle}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-navy-900 text-[15px] font-semibold">
                          {formatPrice(order.totalPrice.amount, order.totalPrice.currencyCode)}
                        </td>
                        <td className="px-8 py-5">
                          <Link
                            href={`/account/orders/${order.number}`}
                            className="text-teal-500 text-[13px] font-medium hover:underline"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
