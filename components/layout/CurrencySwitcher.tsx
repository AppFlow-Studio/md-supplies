'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { setMarketCountry } from '@/app/actions/market'
import type { AvailableCountry } from '@/lib/shopify/types'

function isoToFlag(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65))
}

interface Props {
  availableCountries: AvailableCountry[]
  currentIsoCode: string
}

export function CurrencySwitcher({ availableCountries, currentIsoCode }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const current =
    availableCountries.find((c) => c.isoCode === currentIsoCode) ?? availableCountries[0]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!current || availableCountries.length <= 1) return null

  function handleSelect(country: AvailableCountry) {
    setOpen(false)
    startTransition(async () => {
      await setMarketCountry(country.isoCode)
      router.refresh()
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex items-center gap-1 text-gray-500 hover:text-navy-900 text-[12px] font-medium transition-colors disabled:opacity-50"
        aria-label="Switch currency"
      >
        <span>{isoToFlag(current.isoCode)}</span>
        <span>{current.currency.isoCode}</span>
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-1 w-[200px] bg-white border border-gray-200 shadow-lg z-50 max-h-[280px] overflow-y-auto">
          {availableCountries.map((country) => (
            <button
              key={country.isoCode}
              onClick={() => handleSelect(country)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-[13px] hover:bg-neutral-50 transition-colors text-left ${
                country.isoCode === currentIsoCode
                  ? 'text-teal-600 font-semibold bg-teal-50'
                  : 'text-navy-900'
              }`}
            >
              <span className="text-[16px]">{isoToFlag(country.isoCode)}</span>
              <span className="flex-1">{country.name}</span>
              <span className="text-gray-400 text-[11px] font-medium">{country.currency.isoCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
