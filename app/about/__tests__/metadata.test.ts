import { describe, it, expect } from 'vitest'
import { metadata } from '../page'

describe('about page metadata — OG image', () => {
  it('uses the about hero image as an absolute URL', () => {
    const images = (metadata.openGraph as { images?: { url: string }[] })?.images
    expect(images?.[0]?.url).toBe('https://mdsupplies.com/images/about/HERO.png')
  })
})
