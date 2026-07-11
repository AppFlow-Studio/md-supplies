import { buildMetadata } from '@/lib/seo'
import { ContactForm } from './ContactForm'
import { SITE_CONTACT, formatAddress } from '@/lib/site-contact'

export const metadata = buildMetadata({
  pageType: 'static',
  title: 'Contact Us',
  description: 'Get in touch with the MDSupplies team for product questions or order support.',
  slug: 'contact',
})

export default function ContactPage() {
  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <div className="max-w-[640px]">
          <h1 className="text-navy-900 text-[32px] font-bold mb-2">Contact Us</h1>
          <p className="text-gray-500 text-[15px] leading-[1.75] mb-6">
            Have a question about an order or product availability?
            Fill out the form and our team will get back to you within one business day.
          </p>

          {/* Visible NAP (M12): same source as the footer and the
              Organization schema (lib/site-contact.ts). Phone and address
              render once the real business values are filled in there. */}
          <address className="not-italic text-gray-500 text-[15px] leading-[1.75] mb-10 space-y-0.5">
            <p>
              Email:{' '}
              <a href={`mailto:${SITE_CONTACT.email}`} className="text-teal-600 hover:text-teal-500 transition-colors">
                {SITE_CONTACT.email}
              </a>
            </p>
            {SITE_CONTACT.phone && (
              <p>
                Phone:{' '}
                <a href={`tel:${SITE_CONTACT.phone}`} className="text-teal-600 hover:text-teal-500 transition-colors">
                  {SITE_CONTACT.phoneDisplay ?? SITE_CONTACT.phone}
                </a>
              </p>
            )}
            {SITE_CONTACT.address && <p>Address: {formatAddress(SITE_CONTACT.address)}</p>}
          </address>

          <ContactForm />
        </div>
      </div>
    </main>
  )
}
