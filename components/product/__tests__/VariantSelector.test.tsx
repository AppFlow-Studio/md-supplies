import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { VariantSelector } from '../VariantSelector'
import type { ProductOption, ProductVariant } from '@/lib/shopify/types'

afterEach(cleanup)

function variant(overrides: Partial<ProductVariant> & Pick<ProductVariant, 'id' | 'selectedOptions'>): ProductVariant {
  return {
    title: 'Variant',
    sku: 'SKU',
    availableForSale: true,
    quantityAvailable: 10,
    price: { amount: '19.99', currencyCode: 'USD' },
    compareAtPrice: null,
    ...overrides,
  }
}

describe('VariantSelector — single-value products (unchanged behavior)', () => {
  it('renders nothing when there are no options', () => {
    const { container } = render(
      <VariantSelector options={[]} variants={[]} selectedVariant={null} onSelect={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for a single option with a single value', () => {
    const options: ProductOption[] = [{ id: 'opt1', name: 'Size', values: ['One Size'] }]
    const v = variant({ id: 'v1', selectedOptions: [{ name: 'Size', value: 'One Size' }] })
    const { container } = render(
      <VariantSelector options={options} variants={[v]} selectedVariant={v} onSelect={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('VariantSelector — many-option product', () => {
  const options: ProductOption[] = [
    { id: 'opt-color', name: 'Color', values: ['Blue', 'White', 'Grey'] },
    { id: 'opt-size', name: 'Size', values: ['Small', 'Large'] },
  ]

  const blueSmall = variant({
    id: 'v-blue-small',
    selectedOptions: [{ name: 'Color', value: 'Blue' }, { name: 'Size', value: 'Small' }],
    price: { amount: '19.99', currencyCode: 'USD' },
  })
  const blueLarge = variant({
    id: 'v-blue-large',
    selectedOptions: [{ name: 'Color', value: 'Blue' }, { name: 'Size', value: 'Large' }],
    price: { amount: '24.99', currencyCode: 'USD' },
  })
  // Out-of-stock but priced — must stay visibly priced, just disabled/labeled.
  const whiteSmall = variant({
    id: 'v-white-small',
    selectedOptions: [{ name: 'Color', value: 'White' }, { name: 'Size', value: 'Small' }],
    price: { amount: '19.99', currencyCode: 'USD' },
    availableForSale: false,
  })
  // Zero-price / quote-only — must never be selectable (fail-closed).
  const greySmall = variant({
    id: 'v-grey-small',
    selectedOptions: [{ name: 'Color', value: 'Grey' }, { name: 'Size', value: 'Small' }],
    price: { amount: '0', currencyCode: 'USD' },
  })
  const variants = [blueSmall, blueLarge, whiteSmall, greySmall]

  function renderSelector(selectedVariant: ProductVariant, onSelect = (_v: ProductVariant) => {}) {
    render(
      <VariantSelector options={options} variants={variants} selectedVariant={selectedVariant} onSelect={onSelect} />,
    )
  }

  it('renders a desktop button and a mobile <select> option per value, for every option group', () => {
    renderSelector(blueSmall)
    // Desktop grid — one button per value across both option groups.
    expect(screen.getAllByRole('button', { name: /Color: (Blue|White|Grey)/ })).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: /Size: (Small|Large)/ })).toHaveLength(2)
    // Mobile dropdown — one <select> per option group.
    expect(screen.getByLabelText('Select Color')).toBeInstanceOf(HTMLSelectElement)
    expect(screen.getByLabelText('Select Size')).toBeInstanceOf(HTMLSelectElement)
  })

  it('shows the selected value as the current value of the mobile dropdown', () => {
    renderSelector(blueLarge)
    expect((screen.getByLabelText('Select Color') as HTMLSelectElement).value).toBe('Blue')
    expect((screen.getByLabelText('Select Size') as HTMLSelectElement).value).toBe('Large')
  })

  it('changing the mobile dropdown selects the correct matching variant (same match logic as desktop)', () => {
    const onSelect = vi.fn()
    renderSelector(blueSmall, onSelect)
    fireEvent.change(screen.getByLabelText('Select Size'), { target: { value: 'Large' } })
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'v-blue-large' }))
  })

  it('clicking the equivalent desktop button selects the same variant the dropdown would', () => {
    const onSelect = vi.fn()
    renderSelector(blueSmall, onSelect)
    fireEvent.click(screen.getByRole('button', { name: 'Size: Large' }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'v-blue-large' }))
  })

  it('marks an out-of-stock (but priced) option unavailable, on both the desktop button and the mobile option, without hiding its price', () => {
    renderSelector(blueSmall)
    const desktopBtn = screen.getByRole('button', { name: 'Color: White' })
    expect(desktopBtn).toBeDisabled()
    expect(desktopBtn).toHaveTextContent('$19.99')

    const mobileOption = screen.getByRole('option', { name: /White/ }) as HTMLOptionElement
    expect(mobileOption.disabled).toBe(true)
    expect(mobileOption.textContent).toContain('$19.99')
    expect(mobileOption.textContent).toContain('Unavailable')
  })

  it('never makes a zero-price/quote-only option look selectable, on both the desktop button and the mobile option', () => {
    // The `disabled` attribute is the real fail-closed mechanism (enforced by
    // the browser itself — a disabled <button> or <option> cannot be chosen
    // via mouse or keyboard), same as it was pre-DESIGN-02 for the desktop
    // grid alone. Both presentations read it from the same `resolvePurchasable`
    // result via `valueMeta`, so neither can drift from the other.
    renderSelector(blueSmall)
    const desktopBtn = screen.getByRole('button', { name: 'Color: Grey' })
    expect(desktopBtn).toBeDisabled()
    expect(desktopBtn).toHaveTextContent('Contact for pricing')

    const mobileOption = screen.getByRole('option', { name: /Grey/ }) as HTMLOptionElement
    expect(mobileOption.disabled).toBe(true)
    expect(mobileOption.textContent).toContain('Contact for pricing')
  })

  it('disables a value with no matching variant for the current combination, with no price shown', () => {
    // Grey + Large has no variant in the fixture set.
    renderSelector(blueLarge)
    const greyBtn = screen.getByRole('button', { name: 'Color: Grey' })
    expect(greyBtn).toBeDisabled()
    expect(greyBtn).not.toHaveTextContent('$')
    expect(greyBtn).not.toHaveTextContent('Contact for pricing')

    const mobileOption = screen.getByRole('option', { name: /Grey/ }) as HTMLOptionElement
    expect(mobileOption.disabled).toBe(true)
    expect(mobileOption.textContent).toBe('Grey')
  })
})
