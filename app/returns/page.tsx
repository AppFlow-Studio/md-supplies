import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  pageType: 'static',
  title: 'Returns',
  description: 'MDSupplies return policy and return request instructions.',
  slug: 'returns',
})

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
