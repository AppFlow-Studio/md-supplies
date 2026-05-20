'use client'

import type { ProductOption, ProductVariant } from '@/lib/shopify/types'

interface Props {
  options: ProductOption[]
  variants: ProductVariant[]
  selectedVariant: ProductVariant | null
  onSelect: (variant: ProductVariant) => void
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

  return (
    <div className="flex flex-col gap-5">
      {options.map((option) => (
        <div key={option.id} className="flex flex-col gap-3">
          <p className="text-navy-900 text-[13px] font-semibold tracking-[0.26px] uppercase">
            {option.name}
          </p>
          <div className="flex gap-3 flex-wrap">
            {option.values.map((value) => {
              const isSelected = selectedVariant?.selectedOptions.some(
                (so) => so.name === option.name && so.value === value,
              )
              const variantForValue = variants.find((v) =>
                v.selectedOptions.some(
                  (so) => so.name === option.name && so.value === value,
                ),
              )
              const available = variantForValue?.availableForSale ?? true

              return (
                <button
                  key={value}
                  onClick={() => handleChange(option.name, value)}
                  disabled={!available}
                  className={`px-4 h-[40px] text-[14px] font-semibold tracking-[0.28px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'bg-navy-900 text-white'
                      : 'border border-[rgba(102,102,100,0.5)] text-navy-900 hover:border-navy-900'
                  }`}
                >
                  {value}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
