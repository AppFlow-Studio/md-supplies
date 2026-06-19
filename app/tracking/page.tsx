import { buildCanonical, buildRobots, buildOg } from '@/lib/seo'

const _trackingCanonical = buildCanonical({ path: '/tracking' })
export const metadata = {
  title: 'Order Tracking | MDSupplies',
  description: 'Track the status of your MDSupplies order.',
  robots: buildRobots({ pageType: 'homepage' }), // non-utility type → index,follow; staging guard applied
  alternates: { canonical: _trackingCanonical },
  ...buildOg({
    pageType: 'homepage',
    title: 'Order Tracking | MDSupplies',
    description: 'Track the status of your MDSupplies order.',
    url: _trackingCanonical,
  }),
}

export default function TrackingPage() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <h1 className="text-navy-900 text-[32px] font-bold">Order Tracking</h1>
        <p className="text-gray-500 text-[15px] mt-4 max-w-[760px] leading-[1.7]">
          Order tracking is being set up. In the meantime, sign in to your account to view order
          status, or contact our team for an update on your shipment.
        </p>
      </div>
    </main>
  )
}
