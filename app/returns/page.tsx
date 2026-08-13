import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { ReturnPolicyContent } from '@/components/policy/ReturnPolicyContent'
import { RETURN_POLICY_TITLE, RETURN_POLICY_SECTIONS } from '@/lib/policy/return-policy'
import { SITE_CONTACT } from '@/lib/site-contact'

// DEV-POLICY-01: renders the client-approved return policy (plan §7.2)
// verbatim from the central policy module. The legal Terms of Service page
// remains separate at /policies/terms.

export const metadata = buildMetadata({
  pageType: 'static',
  title: 'Return Policy',
  description:
    'MDSupplies return policy. Returns are subject to the policy of the vendor or manufacturer that supplies each item — see the Returns tab on the product page.',
  slug: 'returns',
})

export default function ReturnsPage() {
  return (
    <main id="main-content" className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-4">
        <Breadcrumb items={[{ label: RETURN_POLICY_TITLE }]} />
      </div>

      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 pb-16">
        <h1 className="text-navy-900 text-[32px] sm:text-[40px] font-semibold leading-[1.2] tracking-[-0.01em] mb-8">
          {RETURN_POLICY_TITLE}
        </h1>

        <div className="bg-white px-6 sm:px-10 py-8 sm:py-10">
          <ReturnPolicyContent sections={RETURN_POLICY_SECTIONS} />

          <div className="mt-10 pt-6 border-t border-gray-200 max-w-[760px]">
            <p className="text-gray-500 text-[15px] leading-[28px] tracking-[0.3px]">
              Need help with a return? Contact our support team at{' '}
              <a href={`mailto:${SITE_CONTACT.email}`} className="text-teal-500 hover:underline">
                {SITE_CONTACT.email}
              </a>{' '}
              or through the{' '}
              <Link href="/contact" className="text-teal-500 hover:underline">
                contact form
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
