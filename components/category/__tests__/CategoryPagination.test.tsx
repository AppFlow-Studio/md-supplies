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

describe('CategoryPagination filter/sort persistence', () => {
  it('carries sort and filter params into the next-page link', () => {
    const persistParams = new URLSearchParams()
    persistParams.set('sort', 'PRICE_ASC')
    persistParams.append('filter', '{"v":"latex"}')

    render(
      <CategoryPagination
        currentPage={1}
        hasNext={true}
        nextCursor="cursorA"
        prevCursors={[]}
        currentAfter={null}
        baseUrl="/category/gloves"
        persistParams={persistParams}
      />
    )

    const nextLink = screen.getByRole('link', { name: 'Next page' })
    const params = new URLSearchParams(nextLink.getAttribute('href')?.split('?')[1])
    expect(params.get('sort')).toBe('PRICE_ASC')
    expect(params.getAll('filter')).toEqual(['{"v":"latex"}'])
    expect(params.get('page')).toBe('2')
    expect(params.get('after')).toBe('cursorA')
  })

  it('carries sort and filter params into the previous-page link', () => {
    const persistParams = new URLSearchParams()
    persistParams.set('sort', 'CREATED')
    persistParams.append('filter', '{"v":"nitrile"}')

    render(
      <CategoryPagination
        currentPage={2}
        hasNext={false}
        nextCursor={null}
        prevCursors={['cursorA']}
        currentAfter="cursorB"
        baseUrl="/category/gloves"
        persistParams={persistParams}
      />
    )

    const prevLink = screen.getByRole('link', { name: 'Previous page' })
    const params = new URLSearchParams(prevLink.getAttribute('href')?.split('?')[1])
    expect(params.get('sort')).toBe('CREATED')
    expect(params.getAll('filter')).toEqual(['{"v":"nitrile"}'])
  })
})

describe('CategoryPagination scroll behavior', () => {
  it('disables scroll-to-top on the next-page link', () => {
    render(
      <CategoryPagination
        currentPage={1}
        hasNext={true}
        nextCursor="cursorA"
        prevCursors={[]}
        currentAfter={null}
        baseUrl="/category/gloves"
      />
    )

    const nextLink = screen.getByRole('link', { name: 'Next page' })
    expect(nextLink).toHaveAttribute('data-scroll', 'false')
  })

  it('disables scroll-to-top on the previous-page link', () => {
    render(
      <CategoryPagination
        currentPage={2}
        hasNext={false}
        nextCursor={null}
        prevCursors={['cursorA']}
        currentAfter="cursorB"
        baseUrl="/category/gloves"
      />
    )

    const prevLink = screen.getByRole('link', { name: 'Previous page' })
    expect(prevLink).toHaveAttribute('data-scroll', 'false')
  })

  it('disables scroll-to-top on a numbered page link', () => {
    render(
      <CategoryPagination
        currentPage={1}
        hasNext={true}
        nextCursor="cursorA"
        prevCursors={[]}
        currentAfter={null}
        baseUrl="/category/gloves"
      />
    )

    const pageTwoLink = screen.getByRole('link', { name: '2' })
    expect(pageTwoLink).toHaveAttribute('data-scroll', 'false')
  })
})
