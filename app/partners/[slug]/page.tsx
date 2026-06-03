import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return buildMetadata({ pageType: 'partner-detail', slug })
}

export default async function PartnerPage({ params }: Props) {
  await params
  notFound()
}
