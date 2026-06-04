import type { Metadata } from 'next'
import { buildMetadata } from '@/lib/seo'
import { mockOCCHub } from '@/lib/mock/occ'
import { OCCHubPage } from '@/components/b2b/OCCHub'

export const metadata: Metadata = buildMetadata({
  pageType: 'occ',
  title: mockOCCHub.seoTitle,
  description: mockOCCHub.seoDescription || mockOCCHub.intro,
})

export default function OCCPage() {
  return <OCCHubPage hub={mockOCCHub} />
}
