import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Truck } from 'lucide-react'
import { getSession } from '@/lib/shopify/session'
import { customerFetch } from '@/lib/shopify/customer'
import { GET_ORDER_DETAILS } from '@/lib/shopify/queries/customer'

export const metadata: Metadata = {
  title: 'Order Details | MD Supplies',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ number: string }>
}

type Money = { amount: string; currencyCode: string }

type DetailLineItem = {
  title: string | null
  quantity: number
  sku: string | null
  variantTitle: string | null
  image: { url: string; altText: string | null } | null
  price: Money | null
  totalPrice: Money | null
}

type DetailOrder = {
  id: string
  number: number
  processedAt: string
  financialStatus: string | null
  fulfillmentStatus: string
  totalPrice: Money
  subtotal: Money | null
  totalShipping: Money | null
  totalTax: Money | null
  shippingAddress: {
    firstName: string | null
    lastName: string | null
    address1: string | null
    address2: string | null
    city: string | null
    province: string | null
    country: string | null
    zip: string | null
  } | null
  lineItems: { nodes: DetailLineItem[] }
  fulfillments: {
    nodes: { trackingInformation: { company: string | null; number: string | null; url: string | null }[] }[]
  }
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatPrice(money: Money): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: money.currencyCode,
  }).format(parseFloat(money.amount))
}

function getFulfillmentDisplay(status: string): { label: string; style: string } {
  switch (status) {
    case 'FULFILLED':           return { label: 'Delivered',  style: 'bg-green-100 text-green-700'   }
    case 'IN_PROGRESS':         return { label: 'Shipped',    style: 'bg-blue-100 text-blue-700'     }
    case 'PARTIALLY_FULFILLED': return { label: 'Partial',    style: 'bg-blue-100 text-blue-700'     }
    default:                    return { label: 'Processing', style: 'bg-yellow-100 text-yellow-700' }
  }
}

export default async function OrderDetailPage({ params }: Props) {
  const { number: numberParam } = await params
  const orderNumber = Number(numberParam)
  if (!Number.isInteger(orderNumber)) notFound()

  const session = await getSession()
  if (!session) redirect('/api/auth/login')

  if (Date.now() >= session.expiresAt - 60_000) {
    redirect(`/api/auth/refresh?next=${encodeURIComponent(`/account/orders/${numberParam}`)}`)
  }

  // The Customer Account API has no lookup-by-number (or root order-by-id), so fetch
  // the customer's recent orders with full detail and match by number here.
  let order: DetailOrder | null = null
  try {
    const res = await customerFetch<{ customer: { orders: { nodes: DetailOrder[] } } }>(
      GET_ORDER_DETAILS,
      session.accessToken,
      { first: 100 },
    )
    order = res.customer.orders.nodes.find((o) => o.number === orderNumber) ?? null
  } catch {
    redirect('/api/auth/login')
  }

  if (!order) notFound()

  const { label: statusLabel, style: statusStyle } = getFulfillmentDisplay(order.fulfillmentStatus)
  const tracking = order.fulfillments.nodes.flatMap((f) => f.trackingInformation)

  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-8">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1 text-gray-500 text-[14px] hover:text-navy-900 transition-colors mb-6"
        >
          <ChevronLeft size={14} />
          Back to Orders
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-navy-900 text-[32px] font-semibold">Order #{order.number}</h1>
            <span className={`inline-flex px-3 py-1 text-[12px] font-semibold rounded-full ${statusStyle}`}>
              {statusLabel}
            </span>
          </div>
          <span className="text-gray-500 text-[15px]">Placed {formatDate(order.processedAt)}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-gray-200">
          {/* Line items */}
          <div className="lg:col-span-2 bg-white">
            <div className="px-8 pt-8 pb-5 border-b border-gray-200">
              <h2 className="text-navy-900 text-[20px] font-semibold">Items</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {order.lineItems.nodes.map((item, i) => {
                const variant = item.variantTitle && item.variantTitle !== 'Default Title' ? item.variantTitle : null
                const lineMoney = item.totalPrice ?? item.price
                return (
                  <div key={i} className="flex items-center gap-4 px-8 py-5">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image.url}
                        alt={item.image.altText ?? item.title ?? 'Product'}
                        className="w-[64px] h-[64px] object-cover border border-gray-200 shrink-0"
                      />
                    ) : (
                      <div className="w-[64px] h-[64px] bg-neutral-100 border border-gray-200 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-navy-900 text-[15px] font-medium">{item.title}</p>
                      {variant && <p className="text-gray-500 text-[13px]">{variant}</p>}
                      {item.sku && <p className="text-gray-400 text-[12px]">SKU: {item.sku}</p>}
                      <p className="text-gray-500 text-[13px]">Qty {item.quantity}</p>
                    </div>
                    {lineMoney && (
                      <span className="text-navy-900 text-[15px] font-semibold shrink-0">
                        {formatPrice(lineMoney)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Summary + address + tracking */}
          <div className="bg-white flex flex-col">
            {/* Totals */}
            <div className="px-8 pt-8 pb-6 border-b border-gray-200">
              <h2 className="text-navy-900 text-[20px] font-semibold mb-5">Summary</h2>
              <dl className="flex flex-col gap-3 text-[15px]">
                {order.subtotal && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Subtotal</dt>
                    <dd className="text-navy-900">{formatPrice(order.subtotal)}</dd>
                  </div>
                )}
                {order.totalShipping && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Shipping</dt>
                    <dd className="text-navy-900">{formatPrice(order.totalShipping)}</dd>
                  </div>
                )}
                {order.totalTax && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Tax</dt>
                    <dd className="text-navy-900">{formatPrice(order.totalTax)}</dd>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-gray-200">
                  <dt className="text-navy-900 font-semibold">Total</dt>
                  <dd className="text-navy-900 font-semibold">{formatPrice(order.totalPrice)}</dd>
                </div>
              </dl>
            </div>

            {/* Shipping address */}
            {order.shippingAddress && (
              <div className="px-8 py-6 border-b border-gray-200">
                <h3 className="text-gray-500 text-[12px] font-semibold uppercase tracking-[0.3px] mb-3">
                  Shipping Address
                </h3>
                <address className="not-italic text-navy-900 text-[15px] leading-[1.6]">
                  {[order.shippingAddress.firstName, order.shippingAddress.lastName].filter(Boolean).join(' ')}<br />
                  {order.shippingAddress.address1}<br />
                  {order.shippingAddress.address2 && <>{order.shippingAddress.address2}<br /></>}
                  {[order.shippingAddress.city, order.shippingAddress.province, order.shippingAddress.zip]
                    .filter(Boolean)
                    .join(', ')}<br />
                  {order.shippingAddress.country}
                </address>
              </div>
            )}

            {/* Tracking */}
            {tracking.length > 0 && (
              <div className="px-8 py-6">
                <h3 className="text-gray-500 text-[12px] font-semibold uppercase tracking-[0.3px] mb-3">
                  Tracking
                </h3>
                <div className="flex flex-col gap-3">
                  {tracking.map((t, i) => {
                    const label = `${t.company ? `${t.company} — ` : ''}${t.number ?? ''}`.trim() || 'Tracking'
                    return t.url ? (
                      <a
                        key={i}
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-teal-500 text-[14px] font-medium hover:underline"
                      >
                        <Truck size={16} />
                        {label}
                      </a>
                    ) : (
                      <span key={i} className="inline-flex items-center gap-2 text-navy-900 text-[14px]">
                        <Truck size={16} />
                        {label}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
