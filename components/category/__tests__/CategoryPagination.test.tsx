import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'
import { CategoryPagination } from '../CategoryPagination'

vi.mock('next/link', () => ({
  default: ({ href, scroll, children, ...rest }: { href: string; scroll?: boolean; children: ReactNode }) => (
    <a href={href} data-scroll={String(scroll)} {...rest}>
      {children}
    </a>
  ),
}))

afterEach(cleanup)

describe('CategoryPagination page links', () => {
  it('links directly to page N without carrying any cursor state', () => {
    const persistParams = new URLSearchParams()
    persistParams.set('sort', 'PRICE_ASC')
    persistParams.append('filter', '{"v":"latex"}')

    render(
      <CategoryPagination
        currentPage={1}
        hasNext={true}
        baseUrl="/category/gloves"
        persistParams={persistParams}
      />
    )

    const nextLink = screen.getByRole('link', { name: 'Next page' })
    const params = new URLSearchParams(nextLink.getAttribute('href')?.split('?')[1])
    expect(params.get('sort')).toBe('PRICE_ASC')
    expect(params.getAll('filter')).toEqual(['{"v":"latex"}'])
    expect(params.get('page')).toBe('2')
    expect(params.has('after')).toBe(false)
    expect(params.has('cursors')).toBe(false)
  })

  it('omits the page param entirely when linking back to page 1', () => {
    const persistParams = new URLSearchParams()
    persistParams.set('sort', 'CREATED')

    render(
      <CategoryPagination
        currentPage={2}
        hasNext={false}
        baseUrl="/category/gloves"
        persistParams={persistParams}
      />
    )

    const prevLink = screen.getByRole('link', { name: 'Previous page' })
    expect(prevLink.getAttribute('href')).toBe('/category/gloves?sort=CREATED')
  })

  it('computes a direct href for a numbered page with no prior page having been visited', () => {
    render(
      <CategoryPagination currentPage={5} hasNext={true} baseUrl="/category/gloves" />
    )

    const pageSixLink = screen.getByRole('link', { name: '6' })
    expect(pageSixLink.getAttribute('href')).toBe('/category/gloves?page=6')
    const page1Link = screen.getByRole('link', { name: '1' })
    expect(page1Link.getAttribute('href')).toBe('/category/gloves')
  })
})

describe('CategoryPagination scroll behavior', () => {
  it('disables scroll-to-top on the next-page link', () => {
    render(<CategoryPagination currentPage={1} hasNext={true} baseUrl="/category/gloves" />)
    expect(screen.getByRole('link', { name: 'Next page' })).toHaveAttribute('data-scroll', 'false')
  })

  it('disables scroll-to-top on the previous-page link', () => {
    render(<CategoryPagination currentPage={2} hasNext={false} baseUrl="/category/gloves" />)
    expect(screen.getByRole('link', { name: 'Previous page' })).toHaveAttribute('data-scroll', 'false')
  })

  it('disables scroll-to-top on a numbered page link', () => {
    render(<CategoryPagination currentPage={1} hasNext={true} baseUrl="/category/gloves" />)
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute('data-scroll', 'false')
  })
})
