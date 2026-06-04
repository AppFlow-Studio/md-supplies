import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import { getPartnerBySlug, mockPartners } from '@/lib/mock/partners'
import { PartnerDetail } from '@/components/b2b/PartnerDetail'

interface Props {
  params: Promise<{ 'partner-slug': string }>
}

export function generateStaticParams() {
  return mockPartners
    .filter((p) => p.isActive)
    .map((p) => ({ 'partner-slug': p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { 'partner-slug': slug } = await params
  const partner = getPartnerBySlug(slug)
  if (!partner) return {}

  return buildMetadata({
    pageType: 'partner-detail',
    title: partner.seoTitle || partner.name,
    description: partner.seoDescription || partner.description,
    slug: partner.slug,
    image: partner.logo.url,
  })
}

export default async function PartnerDetailPage({ params }: Props) {
  const { 'partner-slug': slug } = await params
  const partner = getPartnerBySlug(slug)

  if (!partner || !partner.isActive) notFound()

  return <PartnerDetail partner={partner} />
}
