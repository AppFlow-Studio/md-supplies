import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { QuickAddModal } from '../QuickAddModal'
import type { ProductCardData } from '@/types/product'

afterEach(cleanup)

// next/image and next/link are used by QuickAddContent (rendered inside QuickAddModal)
vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; sizes?: string }) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    const { fill: _fill, sizes: _sizes, ...rest } = props
    return <img {...rest} />
  },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

const product: ProductCardData = {
  handle: 'test-product',
  title: 'Test Product',
  image: { url: '/test.jpg', altText: 'Test', width: 64, height: 64 },
  brand: 'Test Brand',
  vendor: 'Test Vendor',
  price: 1999,
  sku: 'SKU-1',
  available: true,
  variants: [
    { id: 'v1', title: 'Default', price: 1999, available: true },
  ],
}

describe('QuickAddModal', () => {
  it('renders as a labeled dialog and traps focus inside it', () => {
    const onClose = vi.fn()
    render(<QuickAddModal product={product} onClose={onClose} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<QuickAddModal product={product} onClose={onClose} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('close button has type=button', () => {
    const onClose = vi.fn()
    render(<QuickAddModal product={product} onClose={onClose} />)

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText('Close quick add')).toHaveAttribute('type', 'button')
  })
})
