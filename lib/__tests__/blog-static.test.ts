import { describe, it, expect } from 'vitest'
import { STATIC_ARTICLES } from '@/lib/blog-static'

// Strip HTML tags to measure real prose length (a "thin content" guard).
function textLength(html: string): number {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length
}

describe('static blog articles (E8: priority articles are real, non-thin)', () => {
  it('includes the two priority guides', () => {
    expect(STATIC_ARTICLES['types-of-needles']).toBeDefined()
    expect(STATIC_ARTICLES['types-of-sutures']).toBeDefined()
  })

  for (const [handle, article] of Object.entries(STATIC_ARTICLES)) {
    describe(handle, () => {
      it('has a title and excerpt', () => {
        expect(article.title.length).toBeGreaterThan(10)
        expect(article.excerpt && article.excerpt.length).toBeGreaterThan(20)
      })

      it('has substantial body content (not thin)', () => {
        expect(textLength(article.contentHtml)).toBeGreaterThan(800)
      })

      it('uses multiple section headings', () => {
        const headings = article.contentHtml.match(/<h2[\s>]/g) ?? []
        expect(headings.length).toBeGreaterThanOrEqual(3)
      })
    })
  }
})
