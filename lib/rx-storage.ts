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
