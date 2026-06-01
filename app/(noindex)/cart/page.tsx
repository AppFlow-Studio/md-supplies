import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cart | MD Supplies',
  robots: { index: false, follow: false },
}

export default function CartPage() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <h1 className="text-navy-900 text-[32px] font-bold">Your Cart</h1>
        <p className="text-gray-500 text-[15px] mt-2">Cart coming soon.</p>
      </div>
    </main>
  )
}
