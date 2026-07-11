import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { ScrollToResults } from '../ScrollToResults'

afterEach(cleanup)

describe('ScrollToResults', () => {
  it('does not scroll on initial mount', () => {
    const scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView

    render(
      <ScrollToResults page={1}>
        <div>results</div>
      </ScrollToResults>
    )

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('scrolls the results into view when the page prop changes', () => {
    const scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView

    const { rerender } = render(
      <ScrollToResults page={1}>
        <div>results</div>
      </ScrollToResults>
    )

    rerender(
      <ScrollToResults page={2}>
        <div>results</div>
      </ScrollToResults>
    )

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('does not scroll again on a re-render where the page is unchanged', () => {
    const scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView

    const { rerender } = render(
      <ScrollToResults page={1}>
        <div>results</div>
      </ScrollToResults>
    )

    rerender(
      <ScrollToResults page={1}>
        <div>results, refreshed</div>
      </ScrollToResults>
    )

    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
