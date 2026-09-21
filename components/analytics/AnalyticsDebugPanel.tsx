'use client'

import { useEffect, useState } from 'react'
import { parseCookieHeader, readGaIdentifiers } from '@/lib/analytics/clientId'

/**
 * Development-only dataLayer inspector.
 *
 * Renders nothing unless BOTH conditions hold:
 *  - the build is non-production (`process.env.NODE_ENV !== 'production'`),
 *    which is statically known at build time so the whole component is
 *    tree-shaken out of the production bundle rather than merely hidden; and
 *  - the URL carries `?debug_analytics=1`, so a dev session is not permanently
 *    covered by an overlay.
 *
 * It reads the dataLayer that GTM already maintains and never pushes to it, so
 * inspecting cannot alter what is measured.
 */
const MAX_ROWS = 25

interface Row {
  n: number
  name: string
  payload: string
}

export function AnalyticsDebugPanel() {
  const [rows, setRows] = useState<Row[]>([])
  const [identity, setIdentity] = useState<string>('—')
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    if (!new URLSearchParams(window.location.search).has('debug_analytics')) return

    const w = window as unknown as { dataLayer?: unknown[] }
    w.dataLayer = w.dataLayer || []
    const layer = w.dataLayer

    const render = () => {
      const next: Row[] = []
      layer.forEach((entry, i) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return
        const obj = entry as Record<string, unknown>
        if (typeof obj.event !== 'string') return
        next.push({ n: i, name: obj.event, payload: JSON.stringify(obj, null, 1) })
      })
      setRows(next.slice(-MAX_ROWS))
      const { clientId, session } = readGaIdentifiers(parseCookieHeader(document.cookie))
      setIdentity(
        `client_id=${clientId ?? 'none'} session_id=${session?.sessionId ?? 'none'}`,
      )
    }

    render()
    // Polling rather than monkey-patching dataLayer.push: wrapping push is the
    // usual trick but it puts our code in the path of every real tag, which is
    // exactly the kind of thing that must not be able to break checkout.
    const timer = window.setInterval(render, 1000)
    return () => window.clearInterval(timer)
  }, [])

  if (process.env.NODE_ENV === 'production' || rows.length === 0) return null

  return (
    <div className="fixed bottom-0 right-0 z-[9999] max-w-[420px] max-h-[60vh] overflow-auto bg-black/90 text-green-300 text-[11px] font-mono p-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-white underline mb-2">
        analytics debug ({rows.length}) {open ? '▼' : '▲'}
      </button>
      {open && (
        <>
          <p className="text-yellow-300 mb-2 break-all">{identity}</p>
          {rows.map((r) => (
            <details key={r.n} className="mb-1">
              <summary className="cursor-pointer">{r.name}</summary>
              <pre className="whitespace-pre-wrap break-all">{r.payload}</pre>
            </details>
          ))}
        </>
      )}
    </div>
  )
}
