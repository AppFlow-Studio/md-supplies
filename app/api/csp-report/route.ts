import { NextResponse } from 'next/server'
import { readJsonBounded } from '@/lib/forms/guards'
import { logServerError } from '@/lib/log-error'

// Browsers POST here on every CSP violation (report-uri directive, set in
// lib/csp.ts). Reports are `application/csp-report` or `application/json`
// bodies — readJsonBounded doesn't care about content-type, only that the
// body parses as JSON within the size cap.
export async function POST(req: Request): Promise<Response> {
  const read = await readJsonBounded(req, 8_192)
  if (read.ok) {
    logServerError('csp-violation', new Error(JSON.stringify(read.data)))
  }
  // Always 204: a malformed report is still an acknowledged delivery — the
  // browser doesn't retry, and there's nothing actionable in a 4xx here.
  return new NextResponse(null, { status: 204 })
}
