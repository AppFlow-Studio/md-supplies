import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return {
    title: `${slug} | MD Supplies`,
  }
}

export default async function PolicyPage({ params }: Props) {
  await params
  notFound()
}
