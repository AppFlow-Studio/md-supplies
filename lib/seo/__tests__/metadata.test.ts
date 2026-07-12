import { describe, it, expect } from 'vitest'
import { buildMetadata } from '../metadata'

const BASE = 'https://mdsupplies.com'

// ─── title patterns ───────────────────────────────────────────────────────────

describe('buildMetadata — title patterns', () => {
  it('homepage: fixed title', () => {
    const m = buildMetadata({ pageType: 'homepage' })
    expect(m.title).toBe('MDSupplies — Medical & Dental Supplies')
  })

  it('categories-hub: fixed title', () => {
    expect(buildMetadata({ pageType: 'categories-hub' }).title).toBe('All Categories — MDSupplies')
  })

  it('category: {title} — MDSupplies', () => {
    expect(buildMetadata({ pageType: 'category', title: 'Exam Gloves' }).title).toBe('Exam Gloves — MDSupplies')
  })

  it('subcategory: {title} — {parent} — MDSupplies', () => {
    expect(
      buildMetadata({ pageType: 'subcategory', title: 'Nitrile Gloves', parentSlug: 'exam-gloves' }).title,
    ).toBe('Nitrile Gloves — Exam Gloves — MDSupplies')
  })

  it('product: {title} — MDSupplies', () => {
    expect(buildMetadata({ pageType: 'product', title: 'BD Syringe 3ml' }).title).toBe('BD Syringe 3ml — MDSupplies')
  })

  it('partners: fixed title', () => {
    expect(buildMetadata({ pageType: 'partners' }).title).toBe('Our Partners — MDSupplies')
  })

  it('partner-detail: {title} — MDSupplies Partner', () => {
    expect(buildMetadata({ pageType: 'partner-detail', title: 'Cardinal Health' }).title).toBe('Cardinal Health — MDSupplies Partner')
  })

  it('industry: {title} Supplies — MDSupplies', () => {
    expect(buildMetadata({ pageType: 'industry', title: 'Urgent Care' }).title).toBe('Urgent Care Supplies — MDSupplies')
  })

  it('occ: fixed title', () => {
    expect(buildMetadata({ pageType: 'occ' }).title).toBe('OCC Solutions — MDSupplies')
  })

  it('blog-hub: fixed title', () => {
    expect(buildMetadata({ pageType: 'blog-hub' }).title).toBe('Blog — MDSupplies')
  })

  it('blog-article: {title} — MDSupplies Blog', () => {
    expect(buildMetadata({ pageType: 'blog-article', title: 'Best Gloves for Urgent Care' }).title).toBe(
      'Best Gloves for Urgent Care — MDSupplies Blog',
    )
  })

  it('utility: {title} — MDSupplies', () => {
    expect(buildMetadata({ pageType: 'utility', title: 'Search' }).title).toBe('Search — MDSupplies')
  })
})

// ─── fallback behaviour ───────────────────────────────────────────────────────

describe('buildMetadata — fallbacks (never blank)', () => {
  it('title is never blank when title input is undefined', () => {
    const types = [
      'homepage', 'categories-hub', 'category', 'subcategory', 'product',
      'partners', 'partner-detail', 'industry', 'occ', 'blog-hub', 'blog-article', 'utility',
    ] as const
    for (const pageType of types) {
      const m = buildMetadata({ pageType })
      expect(m.title).toBeTruthy()
      expect(typeof m.title).toBe('string')
    }
  })

  it('title is never blank when title is empty string', () => {
    const m = buildMetadata({ pageType: 'product', title: '' })
    expect(m.title).toBeTruthy()
  })

  it('description falls back to site default when omitted', () => {
    const m = buildMetadata({ pageType: 'category', title: 'Gloves' })
    expect(m.description).toBeTruthy()
    expect(m.description).not.toBe('')
  })

  it('description falls back when empty string', () => {
    const m = buildMetadata({ pageType: 'product', title: 'Syringe', description: '' })
    expect(m.description).toBeTruthy()
  })

  it('OG image always present (falls back to default)', () => {
    const m = buildMetadata({ pageType: 'product', title: 'Syringe' })
    const images = (m.openGraph as { images?: unknown[] })?.images
    expect(images).toHaveLength(1)
    expect((images![0] as { url: string }).url).toBeTruthy()
  })

  it('OG image uses provided URL when given', () => {
    const m = buildMetadata({ pageType: 'product', title: 'Syringe', image: 'https://cdn.example.com/img.jpg' })
    const images = (m.openGraph as { images?: unknown[] })?.images
    expect((images![0] as { url: string }).url).toBe('https://cdn.example.com/img.jpg')
  })

  it('OG image uses custom width/height when provided', () => {
    const m = buildMetadata({
      pageType: 'product',
      title: 'Syringe',
      image: 'https://cdn.example.com/img.jpg',
      imageWidth: 1600,
      imageHeight: 900,
    })
    const images = (m.openGraph as { images?: { width: number; height: number }[] })?.images
    expect(images![0].width).toBe(1600)
    expect(images![0].height).toBe(900)
  })

  it('OG image falls back to 1200x630 when no dimensions given', () => {
    const m = buildMetadata({ pageType: 'product', title: 'Syringe', image: 'https://cdn.example.com/img.jpg' })
    const images = (m.openGraph as { images?: { width: number; height: number }[] })?.images
    expect(images![0].width).toBe(1200)
    expect(images![0].height).toBe(630)
  })

  it('OG image resolves a root-relative path to an absolute URL', () => {
    const m = buildMetadata({ pageType: 'static', title: 'About', image: '/images/about/HERO.png' })
    const images = (m.openGraph as { images?: { url: string }[] })?.images
    expect(images![0].url).toBe(`${BASE}/images/about/HERO.png`)
  })

  it('OG image leaves an already-absolute URL untouched', () => {
    const m = buildMetadata({ pageType: 'product', title: 'Syringe', image: 'https://cdn.shopify.com/img.jpg' })
    const images = (m.openGraph as { images?: { url: string }[] })?.images
    expect(images![0].url).toBe('https://cdn.shopify.com/img.jpg')
  })

  it('subcategory falls back gracefully without parentSlug', () => {
    const m = buildMetadata({ pageType: 'subcategory', title: 'Nitrile' })
    expect(m.title).toBe('Nitrile — MDSupplies')
  })
})

// ─── canonical ────────────────────────────────────────────────────────────────

describe('buildMetadata — canonical', () => {
  it('homepage canonical is site root', () => {
    const m = buildMetadata({ pageType: 'homepage' })
    expect((m.alternates as { canonical?: string })?.canonical).toBe(`${BASE}/`)
  })

  it('category canonical includes slug', () => {
    const m = buildMetadata({ pageType: 'category', slug: 'exam-gloves' })
    expect((m.alternates as { canonical?: string })?.canonical).toBe(`${BASE}/category/exam-gloves`)
  })

  it('product canonical includes slug', () => {
    const m = buildMetadata({ pageType: 'product', slug: 'bd-syringe-3ml' })
    expect((m.alternates as { canonical?: string })?.canonical).toBe(`${BASE}/product/bd-syringe-3ml`)
  })

  it('blog-article canonical includes slug', () => {
    const m = buildMetadata({ pageType: 'blog-article', slug: 'best-gloves' })
    expect((m.alternates as { canonical?: string })?.canonical).toBe(`${BASE}/blog/best-gloves`)
  })
})

// ─── robots ───────────────────────────────────────────────────────────────────

describe('buildMetadata — robots', () => {
  it('public pages are index,follow by default', () => {
    expect(buildMetadata({ pageType: 'category', title: 'Gloves' }).robots).toBe('index,follow')
    expect(buildMetadata({ pageType: 'product', title: 'Syringe' }).robots).toBe('index,follow')
    expect(buildMetadata({ pageType: 'blog-article', title: 'Article' }).robots).toBe('index,follow')
  })

  it('utility pages are noindex,follow', () => {
    expect(buildMetadata({ pageType: 'utility', title: 'Search' }).robots).toBe('noindex,follow')
  })

  it('noIndex: true forces noindex,follow', () => {
    expect(buildMetadata({ pageType: 'category', title: 'Gloves', noIndex: true }).robots).toBe('noindex,follow')
  })
})

// ─── OG type ─────────────────────────────────────────────────────────────────

describe('buildMetadata — og:type', () => {
  it('blog-article uses article type', () => {
    const m = buildMetadata({ pageType: 'blog-article', title: 'Test' })
    expect((m.openGraph as { type?: string })?.type).toBe('article')
  })

  it('product omits og:type from metadata — the page hoists og:type=product itself (L10)', () => {
    const m = buildMetadata({ pageType: 'product', title: 'Syringe' })
    expect((m.openGraph as { type?: string })?.type).toBeUndefined()
  })

  it('everything else uses website type', () => {
    const types = ['homepage', 'category', 'blog-hub', 'industry'] as const
    for (const pageType of types) {
      const m = buildMetadata({ pageType })
      expect((m.openGraph as { type?: string })?.type).toBe('website')
    }
  })
})

// ─── Twitter card ─────────────────────────────────────────────────────────────

describe('buildMetadata — twitter card', () => {
  it('always summary_large_image', () => {
    const m = buildMetadata({ pageType: 'product', title: 'Syringe' })
    expect((m.twitter as { card?: string })?.card).toBe('summary_large_image')
  })

  it('twitter image matches OG image', () => {
    const m = buildMetadata({ pageType: 'product', title: 'Syringe', image: 'https://cdn.example.com/p.jpg' })
    const twitterImages = (m.twitter as { images?: string[] })?.images
    expect(twitterImages?.[0]).toBe('https://cdn.example.com/p.jpg')
  })
})

describe('buildMetadata — explicit canonical override', () => {
  it('uses canonical override instead of slug-derived path', () => {
    const m = buildMetadata({
      pageType: 'category',
      title: 'Exam Gloves',
      slug: 'exam-gloves',
      canonical: `${BASE}/category/exam-gloves`,
    })
    expect((m.alternates as { canonical?: string })?.canonical).toBe(`${BASE}/category/exam-gloves`)
  })

  it('override canonical is used even when slug differs', () => {
    const m = buildMetadata({
      pageType: 'category',
      title: 'Gloves',
      slug: 'other',
      canonical: `${BASE}/category/gloves`,
    })
    expect((m.alternates as { canonical?: string })?.canonical).toBe(`${BASE}/category/gloves`)
  })
})
