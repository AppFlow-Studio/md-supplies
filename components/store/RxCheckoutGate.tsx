'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { cartRequiresRxGate, type RxGateStatus } from '@/lib/rx-gate'
import { getRxGateStatus, prepareCheckout } from '@/app/actions/rx'
import type { Cart } from '@/lib/shopify/types'

// Shared pre-checkout RX gate for both cart surfaces (page + popup).
// UX layer only — the CTA block is bypassable by cart URL by design; the
// compliance control is the companion validation app. prepareCheckout()
// re-checks server-side and runs cartBuyerIdentityUpdate before handoff.

export function useRxGate(cart: Cart | null) {
  // null = status unknown (loading); gate renders only on a definite block.
  const [status, setStatus] = useState<RxGateStatus | null>(null)

  const cartHasRx = cart ? cartRequiresRxGate(cart.lines.nodes) : false
  const cartId = cart?.id ?? null
  const totalQuantity = cart?.totalQuantity ?? 0

  // Only async work here — a non-RX cart never fetches, and `blocked` below
  // derives from cartHasRx instead of a synchronous setState(null) reset.
  const refresh = useCallback(() => {
    if (!cartHasRx) return
    let cancelled = false
    getRxGateStatus()
      .then((s) => { if (!cancelled) setStatus(s) })
      .catch(() => { /* leave unknown — CTA stays enabled, server re-checks */ })
    return () => { cancelled = true }
  }, [cartHasRx, cartId, totalQuantity]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => refresh(), [refresh])

  /**
   * Gate-aware handoff: server re-check + buyer-identity association, then
   * navigate. Returns false when blocked (caller keeps the UI open).
   */
  const proceedToCheckout = useCallback(async (): Promise<boolean> => {
    try {
      const result = await prepareCheckout()
      if (!result.ok) {
        setStatus(result.status)
        return false
      }
      window.location.href = result.checkoutUrl
      return true
    } catch (err) {
      console.error('[RxCheckoutGate] prepareCheckout failed:', err)
      // Fall back to the raw checkout URL only for non-RX carts.
      if (!cartHasRx && cart) {
        window.location.href = cart.checkoutUrl
        return true
      }
      return false
    }
  }, [cart, cartHasRx])

  return {
    blocked: cartHasRx && (status?.blocked ?? false),
    signedIn: status?.signedIn ?? false,
    proceedToCheckout,
  }
}

export function RxGatePanel({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="border border-amber-300 bg-amber-50 p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <ShieldAlert size={18} className="text-amber-600 shrink-0" />
        <span className="text-navy-900 text-[14px] font-semibold">
          Prescription required
        </span>
      </div>
      {signedIn ? (
        <>
          <p className="text-gray-600 text-[13px] leading-relaxed">
            Your cart contains items that require a prescription or medical
            license on file. Upload it once to your account — you won&apos;t be
            asked again on future orders.
          </p>
          <Link
            href="/account"
            className="bg-navy-900 text-white h-[44px] flex items-center justify-center text-[14px] font-semibold tracking-[0.28px] hover:bg-navy-950 transition-colors"
          >
            Upload Prescription Document
          </Link>
        </>
      ) : (
        <>
          <p className="text-gray-600 text-[13px] leading-relaxed">
            Your cart contains items that require a prescription or medical
            license on file. Sign in or create an account to add your document —
            guest checkout isn&apos;t available for these items.
          </p>
          <Link
            href="/account/login"
            className="bg-navy-900 text-white h-[44px] flex items-center justify-center text-[14px] font-semibold tracking-[0.28px] hover:bg-navy-950 transition-colors"
          >
            Sign In / Create Account
          </Link>
        </>
      )}
    </div>
  )
}
