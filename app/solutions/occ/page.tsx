import { buildMetadata } from '@/lib/seo'

export const metadata = buildMetadata({
  pageType: 'occ',
  description: 'Free shipping on all OCC-eligible medical supplies for qualifying facilities.',
})

export default function OccPage() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <h1 className="text-navy-900 text-[32px] font-bold">OCC Program</h1>
        <p className="text-gray-500 text-[15px] mt-2">Coming soon.</p>
      </div>
    </main>
  )
}
