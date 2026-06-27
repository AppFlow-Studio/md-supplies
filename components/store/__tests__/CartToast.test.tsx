import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { CartToast } from '../CartToast'
import { useCart } from '../CartProvider'

vi.mock('../CartProvider', () => ({ useCart: vi.fn() }))

afterEach(cleanup)
beforeEach(() => vi.resetAllMocks())

function setup(lastError: string | null, clearError = vi.fn()) {
  vi.mocked(useCart).mockReturnValue({
    lastError,
    clearError,
  } as unknown as ReturnType<typeof useCart>)
}

describe('CartToast', () => {
  it('is hidden (opacity-0 pointer-events-none) when lastError is null', () => {
    setup(null)
    render(<CartToast />)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('opacity-0')
    expect(alert.className).toContain('pointer-events-none')
  })

  it('is visible when lastError is set', () => {
    setup('Failed to remove item. Please try again.')
    render(<CartToast />)
    const alert = screen.getByRole('alert')
    expect(alert.className).not.toContain('opacity-0')
    expect(screen.getByText('Failed to remove item. Please try again.')).toBeInTheDocument()
  })

  it('calls clearError when dismiss button is clicked', () => {
    const clearError = vi.fn()
    setup('some error', clearError)
    render(<CartToast />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }))
    expect(clearError).toHaveBeenCalledOnce()
  })

  it('auto-clears after 5 seconds', async () => {
    vi.useFakeTimers()
    const clearError = vi.fn()
    setup('some error', clearError)
    render(<CartToast />)
    await act(async () => { vi.advanceTimersByTime(5000) })
    expect(clearError).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })
})
