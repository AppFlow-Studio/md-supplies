import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Account | MD Supplies',
  robots: { index: false, follow: false },
}

export default function AccountPage() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <h1 className="text-navy-900 text-[32px] font-bold">My Account</h1>
        <p className="text-gray-500 text-[15px] mt-2">Account coming soon.</p>
      </div>
    </main>
  )
}
