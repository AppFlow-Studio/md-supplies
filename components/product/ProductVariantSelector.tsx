'use client'

import { useState, useEffect } from 'react'
import type { Product, ProductVariant } from '@/types/product'

interface Props {
  options: Product['options']
  variants: ProductVariant[]
  onVariantChange: (variant: ProductVariant | null) => void
}

function findVariant(
  options: Product['options'],
  selected: Record<string, string>,
  variants: ProductVariant[],
): ProductVariant | null {
  const allSelected = options.every((opt) => selected[opt.name])
  if (!allSelected) return null
  return (
    variants.find((v) =>
      v.selectedOptions.every((o) => selected[o.name] === o.value),
    ) ?? null
  )
}

function isValueAvailable(
  optionName: string,
  value: string,
  selected: Record<string, string>,
  variants: ProductVariant[],
): boolean {
  return variants.some(
    (v) =>
      v.available &&
      v.selectedOptions.some((o) => o.name === optionName && o.value === value) &&
      v.selectedOptions.every(
        (o) => o.name === optionName || !selected[o.name] || selected[o.name] === o.value,
      ),
  )
}

export function ProductVariantSelector({ options, variants, onVariantChange }: Props) {
  const initial = options.reduce<Record<string, string>>((acc, opt) => {
    acc[opt.name] = opt.values[0] ?? ''
    return acc
  }, {})

  const [selected, setSelected] = useState<Record<string, string>>(initial)

  useEffect(() => {
    const variant = findVariant(options, selected, variants)
    onVariantChange(variant)
  }, [selected, options, variants, onVariantChange])

  function handleSelect(optionName: string, value: string) {
    setSelected((prev) => ({ ...prev, [optionName]: value }))
  }

  return (
    <div className="flex flex-col gap-5">
      {options.map((option) => (
        <div key={option.name}>
          <p className="text-sm font-medium text-navy-900 mb-2">
            {option.name}:{' '}
            <span className="font-normal text-gray-500">{selected[option.name]}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const isSelected = selected[option.name] === value
              const available = isValueAvailable(option.name, value, selected, variants)
              return (
                <button
                  key={value}
                  onClick={() => handleSelect(option.name, value)}
                  disabled={!available}
                  aria-pressed={isSelected}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    isSelected
                      ? 'border-navy-900 bg-navy-900 text-white'
                      : available
                        ? 'border-gray-200 text-navy-900 hover:border-navy-900'
                        : 'border-gray-200 text-gray-500 bg-gray-50 cursor-not-allowed line-through'
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
