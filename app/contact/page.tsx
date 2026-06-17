import { buildCanonical, buildRobots, buildOg } from '@/lib/seo'
import { ContactForm } from './ContactForm'

const _canonical = buildCanonical({ path: '/contact' })

export const metadata = {
  title: 'Contact Us | MDSupplies',
  description: 'Get in touch with the MDSupplies team for wholesale inquiries, product questions, or order support.',
  robots: buildRobots({ pageType: 'homepage' }),
  alternates: { canonical: _canonical },
  ...buildOg({
    pageType: 'homepage',
    title: 'Contact Us | MDSupplies',
    description: 'Get in touch with the MDSupplies team for wholesale inquiries, product questions, or order support.',
    url: _canonical,
  }),
}

export default function ContactPage() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <div className="max-w-[640px]">
          <h1 className="text-navy-900 text-[32px] font-bold mb-2">Contact Us</h1>
          <p className="text-gray-500 text-[15px] leading-[1.75] mb-10">
            Have a question about an order, product availability, or wholesale pricing?
            Fill out the form and our team will get back to you within one business day.
          </p>
          <ContactForm />
        </div>
      </div>
    </main>
  )
}
