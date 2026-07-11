import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'

interface Props {
  params: Promise<{ slug: string }>
}

const POLICIES: Record<string, { title: string; description: string; intro: string }> = {
  privacy: {
    title: 'Privacy Policy',
    description: 'How MDSupplies collects, uses, and protects your information.',
    intro:
      'This Privacy Policy describes how MDSupplies collects, uses, and safeguards the information you provide when you use our website and place orders. Full details are being finalized.',
  },
  terms: {
    title: 'Terms of Service',
    description: 'The terms and conditions governing use of MDSupplies.com.',
    intro:
      'These Terms of Service govern your access to and use of MDSupplies.com, including browsing, account registration, and purchases. Full details are being finalized.',
  },
  shipping: {
    title: 'Shipping Policy',
    description: 'MDSupplies shipping methods, processing, and delivery information.',
    intro:
      'This Shipping Policy explains our order processing, available shipping methods, and delivery information. Available methods and estimated timeframes are shown at checkout. Full details are being finalized.',
  },
}

export function generateStaticParams() {
  return Object.keys(POLICIES).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const policy = POLICIES[slug]
  if (!policy) return {}

  return buildMetadata({
    pageType: 'static',
    title: policy.title,
    description: policy.description,
    slug: `policies/${slug}`,
  })
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params
  const policy = POLICIES[slug]
  if (!policy) notFound()

  const heading = policy.title

  return (
    <main className="bg-[#f9fafc] min-h-screen">
      <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14 py-14">
        <h1 className="text-navy-900 text-[32px] font-bold">{heading}</h1>
        <p className="text-gray-500 text-[15px] mt-4 max-w-[760px] leading-[1.7]">{policy.intro}</p>
      </div>
    </main>
  )
}
