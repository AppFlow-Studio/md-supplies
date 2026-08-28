'use client'

import type { ProductOption, ProductVariant } from '@/lib/shopify/types'
import { resolvePurchasable, hasUsablePrice, type PurchasableState } from '@/lib/purchasability'

interface Props {
  options: ProductOption[]
  variants: ProductVariant[]
  selectedVariant: ProductVariant | null
  onSelect: (variant: ProductVariant) => void
}

interface ValueMeta {
  value: string
  isSelected: boolean
  variantForValue: ProductVariant | undefined
  variantPrice: number | null
  state: PurchasableState
}

export function VariantSelector({ options, variants, selectedVariant, onSelect }: Props) {
  if (options.length === 0) return null
  if (options.length === 1 && options[0].values.length === 1) return null

  const handleChange = (optionName: string, value: string) => {
    const currentOptions = selectedVariant?.selectedOptions ?? []

    const updatedOptions = options.map((opt) => {
      if (opt.name === optionName) return { name: opt.name, value }
      const existing = currentOptions.find((o) => o.name === opt.name)
      return existing ?? { name: opt.name, value: opt.values[0] }
    })

    const match = variants.find((v) =>
      updatedOptions.every((opt) =>
        v.selectedOptions.some(
          (so) => so.name === opt.name && so.value === opt.value,
        ),
      ),
    )
    if (match) onSelect(match)
  }

  // Single source of truth for every value's purchasability/price, shared by
  // both the desktop button grid and the mobile dropdown below — neither
  // presentation re-implements the variant-matching or fail-closed
  // zero-price/out-of-stock logic, they only render it differently.
  function valueMeta(option: ProductOption, value: string): ValueMeta {
    const isSelected = selectedVariant?.selectedOptions.some(
      (so) => so.name === option.name && so.value === value,
    ) ?? false
    const otherSelected = selectedVariant?.selectedOptions.filter(
      (so) => so.name !== option.name,
    ) ?? []
    const variantForValue = variants.find((v) =>
      v.selectedOptions.some(
        (so) => so.name === option.name && so.value === value,
      ) &&
      otherSelected.every((other) =>
        v.selectedOptions.some(
          (so) => so.name === other.name && so.value === other.value,
        ),
      ),
    )
    // A zero-price option must never be selectable into a purchase
    // attempt, same fail-closed check as the cart gate and quick
    // add (lib/purchasability.ts) — never a local re-implementation.
    const variantPrice = variantForValue ? parseFloat(variantForValue.price.amount) : null
    const state = resolvePurchasable({
      price: variantPrice,
      availableForSale: variantForValue?.availableForSale ?? false,
    })
    return { value, isSelected, variantForValue, variantPrice, state }
  }

  return (
    <div className="flex flex-col gap-5">
      {options.map((option) => {
        const values = option.values.map((value) => valueMeta(option, value))
        const selectId = `variant-select-${option.id}`

        return (
          <div key={option.id} className="flex flex-col gap-3">
            <p className="text-navy-900 text-[15px] font-semibold tracking-[0.3px] uppercase">
              SELECT {option.name}
            </p>

            {/* Desktop/tablet — button grid (unchanged). Hidden below `sm`
                in favor of the dropdown: at narrow widths the grid degraded
                to a horizontally scrolling bar with no indication more
                options existed off-screen (DESIGN-02). */}
            <div className="hidden sm:flex gap-3 flex-wrap">
              {values.map(({ value, isSelected, variantForValue, variantPrice, state }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleChange(option.name, value)}
                  disabled={!state.purchasable}
                  aria-pressed={isSelected}
                  aria-label={`${option.name}: ${value}`}
                  className={`flex flex-col items-start justify-center px-4 h-[77px] min-w-[167px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'bg-navy-900 text-white'
                      : 'border border-[rgba(102,102,100,0.5)] text-navy-900 hover:border-navy-900'
                  }`}
                >
                  <span className="text-[14px] font-semibold tracking-[0.28px]">{value}</span>
                  {variantForValue && (
                    <span className={`text-[13px] mt-0.5 tracking-[0.26px] ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                      {hasUsablePrice(variantPrice) ? `$${variantPrice!.toFixed(2)}` : 'Contact for pricing'}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Mobile — dropdown/select (DESIGN-02). A native <select> keeps
                every value visible/reachable at once (no scroll-bar
                discoverability problem), the selected value is always shown
                closed, and disabled/unavailable options are represented via
                the standard `disabled` option state plus an explicit label
                suffix (screen readers announce "dimmed" inconsistently
                across browsers) — never hidden or silently dropped. Selecting
                a value calls the exact same `handleChange` as the desktop
                grid, so variant matching, the zero-price/out-of-stock gate,
                and the `?variant=` URL sync (useSelectedVariant) all stay
                identical between breakpoints. */}
            <div className="sm:hidden">
              <label htmlFor={selectId} className="sr-only">
                {option.name}
              </label>
              <select
                id={selectId}
                aria-label={`Select ${option.name}`}
                value={values.find((v) => v.isSelected)?.value ?? option.values[0]}
                onChange={(e) => handleChange(option.name, e.target.value)}
                className="w-full h-[52px] px-4 border border-[rgba(102,102,100,0.5)] text-navy-900 text-[14px] font-semibold tracking-[0.28px] bg-white disabled:opacity-40"
              >
                {values.map(({ value, variantForValue, variantPrice, state }) => {
                  const priceLabel = !variantForValue
                    ? ''
                    : hasUsablePrice(variantPrice)
                      ? ` — $${variantPrice!.toFixed(2)}${state.purchasable ? '' : ' (Unavailable)'}`
                      : ' — Contact for pricing'
                  return (
                    <option key={value} value={value} disabled={!state.purchasable}>
                      {value}{priceLabel}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>
        )
      })}
    </div>
  )
}
