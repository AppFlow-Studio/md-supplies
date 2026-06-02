import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buildMetadata } from '@/lib/seo'
import { getIndustryBySlug, generateIndustrySlugs } from '@/lib/mock/industries'
import { IndustryPage } from '@/components/b2b/IndustryPage'

interface Props {
  params: Promise<{ 'industry-slug': string }>
}

export function generateStaticParams() {
  return generateIndustrySlugs()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { 'industry-slug': slug } = await params
  const industry = getIndustryBySlug(slug)
  if (!industry) return {}

  return buildMetadata({
    pageType: 'industry',
    title: industry.seoTitle || industry.name,
    description: industry.seoDescription || industry.intro,
    slug: industry.slug,
    noIndex: !industry.isPopulated,
  })
}

export default async function IndustryDetailPage({ params }: Props) {
  const { 'industry-slug': slug } = await params
  const industry = getIndustryBySlug(slug)

  if (!industry) notFound()

  return <IndustryPage industry={industry} />
}
