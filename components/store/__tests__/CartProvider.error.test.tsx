import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import { CartProvider, useCart } from '../CartProvider'
import { addToCart, removeFromCart, updateCartLine } from '@/app/actions/cart'

vi.mock('@/app/actions/cart', () => ({
  addToCart: vi.fn(),
  getCart: vi.fn(async () => null),
  removeFromCart: vi.fn(),
  updateCartLine: vi.fn(),
}))
vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }))
vi.mock('@/lib/analytics/events', () => ({
  buildAddToCartEvent: vi.fn(() => ({})),
  buildViewCartEvent: vi.fn(() => ({})),
}))

afterEach(cleanup)

function ErrorHarness({
  onError,
  onClear,
}: {
  onError: (err: string | null) => void
  onClear: () => void
}) {
  const { lastError, clearError, addItem, removeItem, updateItem } = useCart()
  onError(lastError)
  return (
    <>
      <button type="button" onClick={() => addItem('variant-1', 1)}>Add</button>
      <button type="button" onClick={() => removeItem('line-1')}>Remove</button>
      <button type="button" onClick={() => updateItem('line-1', 2)}>Update</button>
      <button type="button" onClick={() => { clearError(); onClear() }}>Clear</button>
    </>
  )
}

describe('CartProvider error state', () => {
  it('sets lastError when removeItem fails', async () => {
    vi.mocked(removeFromCart).mockRejectedValueOnce(new Error('network error'))
    let capturedError: string | null = null

    render(
      <CartProvider>
        <ErrorHarness onError={(e) => { capturedError = e }} onClear={vi.fn()} />
      </CartProvider>,
    )

    await act(async () => { screen.getByText('Remove').click() })

    expect(capturedError).toBe('Failed to remove item. Please try again.')
  })

  it('sets lastError when updateItem fails', async () => {
    vi.mocked(updateCartLine).mockRejectedValueOnce(new Error('network error'))
    let capturedError: string | null = null

    render(
      <CartProvider>
        <ErrorHarness onError={(e) => { capturedError = e }} onClear={vi.fn()} />
      </CartProvider>,
    )

    await act(async () => { screen.getByText('Update').click() })

    expect(capturedError).toBe('Failed to update quantity. Please try again.')
  })

  it('clears lastError when clearError is called', async () => {
    vi.mocked(removeFromCart).mockRejectedValueOnce(new Error('network error'))
    let capturedError: string | null = 'initial'
    const onClear = vi.fn()

    render(
      <CartProvider>
        <ErrorHarness onError={(e) => { capturedError = e }} onClear={onClear} />
      </CartProvider>,
    )

    await act(async () => { screen.getByText('Remove').click() })
    expect(capturedError).toBe('Failed to remove item. Please try again.')

    await act(async () => { screen.getByText('Clear').click() })
    expect(capturedError).toBeNull()
  })

  it('sets lastError when addItem fails', async () => {
    vi.mocked(addToCart).mockRejectedValueOnce(new Error('network error'))
    let capturedError: string | null = null

    render(
      <CartProvider>
        <ErrorHarness onError={(e) => { capturedError = e }} onClear={vi.fn()} />
      </CartProvider>,
    )

    await act(async () => { screen.getByText('Add').click() })

    expect(capturedError).toBe('Failed to add item. Please try again.')
  })
})
