import { buildCanonical, buildRobots } from '@/lib/seo'

export const metadata = {
  title: 'Contact Us | MDSupplies',
  description: 'Get in touch with the MD Supplies team for wholesale inquiries.',
  robots: buildRobots({ pageType: 'homepage' }),
  alternates: { canonical: buildCanonical({ path: '/contact' }) },
}

export default function ContactPage() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <h1 className="text-navy-900 text-[32px] font-bold">Contact Us</h1>
        <p className="text-gray-500 text-[15px] mt-2">Coming soon.</p>
      </div>
    </main>
  )
}
