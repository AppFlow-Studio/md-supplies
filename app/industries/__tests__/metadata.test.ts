import { describe, it, expect } from 'vitest'
import { metadata as hubMetadata } from '../page'
import { generateMetadata as generateDetailMetadata } from '../[industry-slug]/page'

function ogImageUrl(m: { openGraph?: unknown }): string | undefined {
  return (m.openGraph as { images?: { url: string }[] })?.images?.[0]?.url
}

describe('industries hub metadata — OG image', () => {
  it('uses the hub hero image as an absolute URL', () => {
    expect(ogImageUrl(hubMetadata)).toBe(
      "https://mdsupplies.com/api/bunny/industries/industry-clinics-&-doctor's-offices.jpeg",
    )
  })
})

describe('industry detail metadata — OG image', () => {
  it('uses the distinct per-industry image', async () => {
    const m = await generateDetailMetadata({ params: Promise.resolve({ 'industry-slug': 'urgent-care' }) })
    expect(ogImageUrl(m)).toBe('https://mdsupplies.com/api/bunny/industries/industry-urgent-care.jpeg')
  })

  it('a different industry gets a different image', async () => {
    const m = await generateDetailMetadata({ params: Promise.resolve({ 'industry-slug': 'dental' }) })
    expect(ogImageUrl(m)).toBe('https://mdsupplies.com/api/bunny/industries/industry-dental.jpeg')
  })
})
