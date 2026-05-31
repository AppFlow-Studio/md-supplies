import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string; sub: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, sub } = await params
  return {
    title: `${sub} — ${slug} | MD Supplies`,
  }
}

export default async function SubcategoryPage({ params }: Props) {
  await params
  notFound()
}
