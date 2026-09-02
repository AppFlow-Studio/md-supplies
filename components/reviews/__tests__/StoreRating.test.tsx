import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { StoreRating } from '../StoreRating'

afterEach(cleanup)

const summary = {
  averageRating: 4.6,
  totalReviews: 128,
  ratingsDistribution: { 1: 3, 2: 1, 3: 5, 4: 40, 5: 79 },
}

describe('StoreRating', () => {
  it('renders an accessible label distinct from product-review copy ("customer experience", not "review")', () => {
    render(<StoreRating summary={summary} />)
    expect(
      screen.getByRole('img', { name: 'Rated 4.6 out of 5 from 128 customer experiences' }),
    ).toBeInTheDocument()
  })

  it('uses singular "experience" for exactly one', () => {
    render(<StoreRating summary={{ ...summary, totalReviews: 1 }} />)
    expect(screen.getByRole('img', { name: /from 1 customer experience$/ })).toBeInTheDocument()
  })

  it('renders nothing for a null summary', () => {
    const { container } = render(<StoreRating summary={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for a zero-review summary — never a fake 0.0', () => {
    const { container } = render(
      <StoreRating summary={{ averageRating: 0, totalReviews: 0, ratingsDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
