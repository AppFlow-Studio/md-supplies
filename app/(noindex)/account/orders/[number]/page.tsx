import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Truck } from 'lucide-react'
import { getSession, isSessionExpiring } from '@/lib/shopify/session'
import { customerFetch } from '@/lib/shopify/customer'
import { GET_ORDER_DETAILS } from '@/lib/shopify/queries/customer'
import { ProductImage } from '@/components/shared/ProductImage'
import { cleanShopifyAlt } from '@/lib/alt-text'
import { computeFulfillmentSummary, shipmentStatusLabel } from '@/lib/fulfillment'

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
  id: string
  title: string | null
  quantity: number
  refundableQuantity: number
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
    nodes: {
      id: string
      createdAt: string | null
      status: string | null
      latestShipmentStatus: string | null
      estimatedDeliveryAt: string | null
      isPickedUp: boolean
      requiresShipping: boolean
      trackingInformation: { company: string | null; number: string | null; url: string | null }[]
      fulfillmentLineItems: { nodes: { quantity: number | null; lineItem: { id: string } | null }[] }
    }[]
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

  if (isSessionExpiring(session.expiresAt)) {
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

  // DEV-ACCOUNT-01: per-shipment item/quantity detail plus exact remaining
  // quantities — never just an order-level "Partial" badge.
  const summary = computeFulfillmentSummary(
    order.lineItems.nodes.map((li) => ({
      id: li.id,
      title: li.title ?? 'Item',
      sku: li.sku,
      variantTitle: li.variantTitle && li.variantTitle !== 'Default Title' ? li.variantTitle : null,
      image: li.image,
      quantity: li.quantity,
      refundableQuantity: li.refundableQuantity,
    })),
    order.fulfillments.nodes.map((f) => ({
      id: f.id,
      createdAt: f.createdAt,
      status: f.status,
      latestShipmentStatus: f.latestShipmentStatus,
      estimatedDeliveryAt: f.estimatedDeliveryAt,
      isPickedUp: f.isPickedUp,
      requiresShipping: f.requiresShipping,
      trackingInformation: f.trackingInformation,
      lines: f.fulfillmentLineItems.nodes
        .filter((fl) => fl.lineItem != null)
        .map((fl) => ({ lineItemId: fl.lineItem!.id, quantity: fl.quantity })),
    })),
  )

  return (
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
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
                      <div className="relative w-[64px] h-[64px] border border-gray-200 shrink-0 overflow-hidden">
                        <ProductImage
                          src={item.image.url}
                          alt={cleanShopifyAlt(item.image.altText) ?? item.title ?? 'Product'}
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
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

          </div>
        </div>

        {/* ── Shipments (DEV-ACCOUNT-01) ── */}
        <section className="mt-8">
          <h2 className="text-navy-900 text-[20px] font-semibold mb-4">Shipments</h2>

          {!summary.hasShipments && summary.pending.length > 0 && (
            <p className="text-gray-500 text-[14px] mb-4">
              No items have shipped yet. You&apos;ll see shipment and tracking details here once
              your order starts shipping.
            </p>
          )}

          <div className="flex flex-col gap-4">
            {summary.shipments.map((shipment, idx) => (
              <div key={shipment.id} className="bg-white border border-gray-200">
                <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-gray-100">
                  <span className="text-navy-900 text-[15px] font-semibold">
                    Shipment {idx + 1} of {summary.shipments.length}
                  </span>
                  <span className="inline-flex px-3 py-1 text-[12px] font-semibold rounded-full bg-blue-100 text-blue-700">
                    {shipmentStatusLabel(shipment)}
                  </span>
                  {shipment.createdAt && (
                    <span className="text-gray-500 text-[13px]">{formatDate(shipment.createdAt)}</span>
                  )}
                  {/* Nullable — never render an empty ETA slot. */}
                  {shipment.estimatedDeliveryAt && (
                    <span className="text-gray-500 text-[13px]">
                      Est. delivery {formatDate(shipment.estimatedDeliveryAt)}
                    </span>
                  )}
                </div>

                {/* Every tracking number for this fulfillment; number renders
                    as text when Shopify provides no URL — never a fabricated
                    carrier link. computeFulfillmentSummary already empties
                    this array when requiresShipping is false. */}
                {shipment.trackingInformation.length > 0 && (
                  <div className="flex flex-col gap-2 px-6 py-4 border-b border-gray-100">
                    {shipment.trackingInformation.map((t, i) => {
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
                )}

                <div className="divide-y divide-gray-100">
                  {shipment.items.map((item) => (
                    <div key={item.lineItemId} className="flex items-center gap-4 px-6 py-4">
                      {item.image ? (
                        <div className="relative w-[48px] h-[48px] border border-gray-200 shrink-0 overflow-hidden">
                          <ProductImage
                            src={item.image.url}
                            alt={cleanShopifyAlt(item.image.altText) ?? item.title}
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-[48px] h-[48px] bg-neutral-100 border border-gray-200 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-navy-900 text-[14px] font-medium">{item.title}</p>
                        {item.variantTitle && <p className="text-gray-500 text-[13px]">{item.variantTitle}</p>}
                        {item.sku && <p className="text-gray-400 text-[12px]">SKU: {item.sku}</p>}
                      </div>
                      <span className="text-navy-900 text-[14px] font-semibold shrink-0">
                        Qty {item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Pending / not yet shipped — exact remaining quantities */}
          {summary.pending.length > 0 && (
            <div className="bg-white border border-gray-200 mt-4">
              <div className="px-6 py-4 border-b border-gray-100">
                <span className="text-navy-900 text-[15px] font-semibold">
                  {summary.hasShipments ? 'Pending — not yet shipped' : 'Not yet shipped'}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {summary.pending.map((p) => (
                  <div key={p.lineItemId} className="flex items-center gap-4 px-6 py-4">
                    {p.image ? (
                      <div className="relative w-[48px] h-[48px] border border-gray-200 shrink-0 overflow-hidden">
                        <ProductImage
                          src={p.image.url}
                          alt={cleanShopifyAlt(p.image.altText) ?? p.title}
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-[48px] h-[48px] bg-neutral-100 border border-gray-200 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-navy-900 text-[14px] font-medium">{p.title}</p>
                      {p.variantTitle && <p className="text-gray-500 text-[13px]">{p.variantTitle}</p>}
                      {p.sku && <p className="text-gray-400 text-[12px]">SKU: {p.sku}</p>}
                      {p.refundedQuantity > 0 && (
                        <p className="text-gray-500 text-[12px]">{p.refundedQuantity} canceled/refunded</p>
                      )}
                    </div>
                    <span className="text-navy-900 text-[14px] font-semibold shrink-0">
                      Qty {p.remaining} remaining
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Canceled/refunded-only lines: disclosed, never shown as pending */}
          {summary.refundedOnly.length > 0 && (
            <div className="bg-white border border-gray-200 mt-4">
              <div className="px-6 py-4 border-b border-gray-100">
                <span className="text-navy-900 text-[15px] font-semibold">Canceled / refunded</span>
              </div>
              <div className="divide-y divide-gray-100">
                {summary.refundedOnly.map((p) => (
                  <div key={p.lineItemId} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-navy-900 text-[14px] font-medium">{p.title}</p>
                      {p.sku && <p className="text-gray-400 text-[12px]">SKU: {p.sku}</p>}
                    </div>
                    <span className="text-gray-500 text-[14px] shrink-0">
                      Qty {p.refundedQuantity} canceled/refunded
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
