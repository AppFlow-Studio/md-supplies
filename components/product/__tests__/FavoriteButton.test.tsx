import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { FavoriteButton } from '../FavoriteButton'

const toggleFavoriteMock = vi.fn()
vi.mock('@/app/actions/favorites', () => ({
  toggleFavorite: (...args: unknown[]) => toggleFavoriteMock(...args),
}))

const trackMock = vi.fn()
vi.mock('@/lib/analytics/track', () => ({ track: (...args: unknown[]) => trackMock(...args) }))

afterEach(() => {
  cleanup()
  toggleFavoriteMock.mockReset()
  trackMock.mockClear()
})

const PRODUCT_ID = 'gid://shopify/Product/1'

function renderButton(overrides: Partial<React.ComponentProps<typeof FavoriteButton>> = {}) {
  return render(
    <FavoriteButton
      productId={PRODUCT_ID}
      productHandle="nitrile-gloves"
      productTitle="Nitrile Gloves"
      variantId="gid://shopify/ProductVariant/1"
      isSignedIn={true}
      initialFavorited={false}
      list="pdp"
      {...overrides}
    />,
  )
}

describe('FavoriteButton — guest', () => {
  it('renders a login link carrying the intended product + return path, never a toggle button', () => {
    renderButton({ isSignedIn: false })
    const link = screen.getByRole('link', { name: 'Add Nitrile Gloves to favorites' })
    const href = link.getAttribute('href')!
    expect(href).toContain('/api/auth/login?')
    expect(href).toContain(`favoriteProductId=${encodeURIComponent(PRODUCT_ID)}`)
    expect(href).toContain('next=%2Fproduct%2Fnitrile-gloves')
    expect(toggleFavoriteMock).not.toHaveBeenCalled()
  })

  it('fires favorite_auth_prompt analytics on click, without blocking the navigation', () => {
    renderButton({ isSignedIn: false })
    fireEvent.click(screen.getByRole('link'))
    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'favorite_auth_prompt', item_id: PRODUCT_ID }),
    )
  })
})

describe('FavoriteButton — signed in', () => {
  it('unsaved: semantic button, aria-pressed=false, accessible "Add" label', () => {
    renderButton({ initialFavorited: false })
    const button = screen.getByRole('button', { name: 'Add Nitrile Gloves to favorites' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('saved: accessible "Remove" label and aria-pressed=true', () => {
    renderButton({ initialFavorited: true })
    const button = screen.getByRole('button', { name: 'Remove Nitrile Gloves from favorites' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('optimistically flips state on click, then confirms via the server action', async () => {
    toggleFavoriteMock.mockResolvedValue({ ok: true, favorited: true })
    renderButton({ initialFavorited: false })

    fireEvent.click(screen.getByRole('button', { name: 'Add Nitrile Gloves to favorites' }))

    // Optimistic: label flips immediately, before the mocked promise resolves.
    expect(screen.getByRole('button', { name: 'Remove Nitrile Gloves from favorites' })).toBeInTheDocument()

    await waitFor(() => {
      expect(toggleFavoriteMock).toHaveBeenCalledWith(PRODUCT_ID, 'gid://shopify/ProductVariant/1')
    })
    await waitFor(() => {
      expect(trackMock).toHaveBeenCalledWith(expect.objectContaining({ event: 'favorite_add', item_id: PRODUCT_ID }))
    })
    expect(screen.getByText('Nitrile Gloves added to favorites')).toBeInTheDocument()
  })

  it('rolls back and announces a concise error when the server action fails', async () => {
    toggleFavoriteMock.mockResolvedValue({ ok: false, error: 'Something went wrong. Please try again.' })
    renderButton({ initialFavorited: false })

    fireEvent.click(screen.getByRole('button', { name: 'Add Nitrile Gloves to favorites' }))
    expect(screen.getByRole('button', { name: 'Remove Nitrile Gloves from favorites' })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add Nitrile Gloves to favorites' })).toBeInTheDocument()
    })
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
    expect(trackMock).not.toHaveBeenCalled()
  })

  it('calls onRemoved only when the confirmed state is unfavorited', async () => {
    toggleFavoriteMock.mockResolvedValue({ ok: true, favorited: false })
    const onRemoved = vi.fn()
    renderButton({ initialFavorited: true, onRemoved })

    fireEvent.click(screen.getByRole('button', { name: 'Remove Nitrile Gloves from favorites' }))

    await waitFor(() => expect(onRemoved).toHaveBeenCalledWith(PRODUCT_ID))
  })

  it('ignores a second click while a toggle is still pending', () => {
    toggleFavoriteMock.mockReturnValue(new Promise(() => {})) // never resolves
    renderButton({ initialFavorited: false })

    const button = screen.getByRole('button', { name: 'Add Nitrile Gloves to favorites' })
    fireEvent.click(button)
    fireEvent.click(screen.getByRole('button')) // second click while pending
    expect(toggleFavoriteMock).toHaveBeenCalledTimes(1)
  })
})
