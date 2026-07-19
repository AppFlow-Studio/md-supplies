import 'server-only'
import { randomUUID } from 'crypto'
import { serverEnv } from '@/lib/env.server'

// RX document storage — sensitive PII (ticket implementation note).
//
// Files live on the existing BunnyCDN STORAGE zone, which has no public Pull
// Zone: the only way in is the Storage API with the server-side AccessKey.
// Two rules keep them private:
//  1. Everything goes under RX_STORAGE_PREFIX, and the public image proxy
//     (app/api/bunny/[...path]) hard-denies that prefix.
//  2. Retrieval is only via /api/account/rx-document, which serves the
//     signed-in customer their OWN document and nothing else.
// Paths embed a UUID so they are not guessable even if a listing leaks.

export const RX_STORAGE_PREFIX = 'rx-documents'

export const RX_ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export const RX_MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

/**
 * Magic-byte sniffing for the four allowed types. The browser-declared MIME
 * type (`File.type`) is attacker-controlled — a script could upload HTML with
 * type image/png. The stored Content-Type is derived from these bytes, never
 * from the declaration, so a forged MIME can't smuggle executable content.
 * Returns the detected allowed type, or null when the bytes match none.
 */
export function sniffRxContentType(body: ArrayBuffer): string | null {
  const b = new Uint8Array(body.slice(0, 16))
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) {
    return 'application/pdf' // %PDF
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // RIFF
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 // WEBP
  ) {
    return 'image/webp'
  }
  return null
}

/** Response Content-Type derived from the stored path's extension — the one
 *  place the allowlist already enforced — so a lying upstream header can't
 *  change what the browser is told. */
export function contentTypeForRxPath(path: string): string | null {
  const ext = path.split('.').pop() ?? ''
  const entry = Object.entries(RX_ALLOWED_TYPES).find(([, e]) => e === ext)
  return entry?.[0] ?? null
}

/** gid://shopify/Customer/123 → "123" (used as the storage folder). */
export function customerFolderId(customerGid: string): string {
  const tail = customerGid.split('/').pop() ?? ''
  if (!/^\d+$/.test(tail)) throw new Error('Unexpected customer id format')
  return tail
}

export function buildRxDocumentPath(customerGid: string, contentType: string): string {
  const ext = RX_ALLOWED_TYPES[contentType]
  if (!ext) throw new Error(`Unsupported RX document type: ${contentType}`)
  return `${RX_STORAGE_PREFIX}/${customerFolderId(customerGid)}/${randomUUID()}.${ext}`
}

/** True when this storage path belongs to the given customer. */
export function isOwnRxDocumentPath(path: string, customerGid: string): boolean {
  return path.startsWith(`${RX_STORAGE_PREFIX}/${customerFolderId(customerGid)}/`)
}

function storageUrl(path: string): string {
  return `https://${serverEnv.bunnyCdnHostname}/${serverEnv.bunnyCdnZone}/${path
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`
}

export async function putRxDocument(path: string, body: ArrayBuffer, contentType: string): Promise<void> {
  const res = await fetch(storageUrl(path), {
    method: 'PUT',
    headers: {
      AccessKey: serverEnv.bunnyCdnAccessKey,
      'Content-Type': contentType,
    },
    body,
  })
  if (!res.ok) throw new Error(`RX document upload failed: HTTP ${res.status}`)
}

/**
 * Best-effort removal of a replaced document blob (retention: exactly one
 * document per customer — the metafield's current path). Returns false
 * instead of throwing: a failed delete must never fail the upload that
 * superseded it, but the caller should audit-log it for manual cleanup.
 */
export async function deleteRxDocument(path: string): Promise<boolean> {
  try {
    const res = await fetch(storageUrl(path), {
      method: 'DELETE',
      headers: { AccessKey: serverEnv.bunnyCdnAccessKey },
    })
    return res.ok
  } catch {
    return false
  }
}

export async function fetchRxDocument(
  path: string,
): Promise<{ body: ReadableStream<Uint8Array>; contentType: string } | null> {
  const res = await fetch(storageUrl(path), {
    headers: { AccessKey: serverEnv.bunnyCdnAccessKey },
    cache: 'no-store',
  })
  if (!res.ok || !res.body) return null
  return {
    body: res.body,
    contentType: res.headers.get('content-type') ?? 'application/octet-stream',
  }
}
