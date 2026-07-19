import 'server-only'

// Malware scanning for RX document uploads (security-hardening ticket,
// Option B). Privacy constraint: prescription files are PII and must NEVER
// be sent to a shared/multiscanner service like VirusTotal (submissions
// there are distributed to the security community). The supported provider
// is therefore a SELF-HOSTED ClamAV REST service (e.g. the standard
// `clamav/clamav` + `benzino77/clamav-rest-api` containers, or
// `ajilaag/clamav-rest`), reachable only by this app.
//
// Config (see .env.example):
//   RX_SCAN_CLAMAV_URL   — scan endpoint, e.g. https://clamav.internal/api/v1/scan
//   RX_SCAN_AUTH_TOKEN   — optional bearer token the service expects
//   RX_SCAN_REQUIRED     — 'true': fail CLOSED (scanner unreachable ⇒ upload
//                          rejected). Unset/'false': scanner errors and a
//                          missing URL fail OPEN with an audit log, so the
//                          upload flow keeps working while the scanner infra
//                          is being stood up. Set to 'true' at launch.

const SCAN_TIMEOUT_MS = 15_000

export type RxScanResult =
  | { status: 'clean' }
  | { status: 'infected'; signature: string }
  | { status: 'skipped' } // no scanner configured
  | { status: 'error'; reason: string } // scanner unreachable/failed

export function isScanRequired(): boolean {
  return process.env.RX_SCAN_REQUIRED === 'true'
}

/**
 * Scans a document with the configured ClamAV REST service. The response
 * shape follows the common clamav-rest APIs: a JSON body whose text contains
 * "OK"/"FOUND", or `{ data: { result: [{ is_infected, viruses }] } }`.
 * Anything unrecognized is treated as an error (never silently clean).
 */
export async function scanRxDocument(body: ArrayBuffer, filename: string): Promise<RxScanResult> {
  const url = process.env.RX_SCAN_CLAMAV_URL
  if (!url) return { status: 'skipped' }

  const form = new FormData()
  form.append('file', new Blob([body]), filename)

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: process.env.RX_SCAN_AUTH_TOKEN
        ? { Authorization: `Bearer ${process.env.RX_SCAN_AUTH_TOKEN}` }
        : undefined,
      body: form,
      signal: AbortSignal.timeout(SCAN_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch (err) {
    return { status: 'error', reason: err instanceof Error ? err.message : 'fetch failed' }
  }

  if (!res.ok) return { status: 'error', reason: `HTTP ${res.status}` }

  let raw: string
  try {
    raw = await res.text()
  } catch {
    return { status: 'error', reason: 'unreadable response' }
  }

  // benzino77/clamav-rest-api JSON shape.
  try {
    const json = JSON.parse(raw) as {
      data?: { result?: Array<{ is_infected?: boolean; viruses?: string[] }> }
    }
    const result = json.data?.result?.[0]
    if (result && typeof result.is_infected === 'boolean') {
      return result.is_infected
        ? { status: 'infected', signature: result.viruses?.join(', ') || 'unknown' }
        : { status: 'clean' }
    }
  } catch {
    // Not JSON — fall through to the plain-text contract.
  }

  // Plain-text clamav-rest contract: "Everything ok : true/false", "OK"/"FOUND".
  if (/\bFOUND\b/.test(raw) || /Everything ok\s*:\s*false/i.test(raw)) {
    return { status: 'infected', signature: raw.slice(0, 120).trim() }
  }
  if (/\bOK\b/.test(raw) || /Everything ok\s*:\s*true/i.test(raw)) {
    return { status: 'clean' }
  }
  return { status: 'error', reason: 'unrecognized scanner response' }
}
