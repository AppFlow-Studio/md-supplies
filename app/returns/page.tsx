import { buildCanonical, buildRobots, buildOg } from '@/lib/seo'

const _returnsCanonical = buildCanonical({ path: '/returns' })
export const metadata = {
  title: 'Returns | MDSupplies',
  description: 'MD Supplies return policy and return request instructions.',
  robots: buildRobots({ pageType: 'homepage' }), // non-utility type → index,follow; staging guard applied
  alternates: { canonical: _returnsCanonical },
  ...buildOg({
    pageType: 'homepage',
    title: 'Returns | MDSupplies',
    description: 'MD Supplies return policy and return request instructions.',
    url: _returnsCanonical,
  }),
}

export default function ReturnsPage() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <h1 className="text-navy-900 text-[32px] font-bold">Returns</h1>
        <p className="text-gray-500 text-[15px] mt-2">Coming soon.</p>
      </div>
    </main>
  )
}
