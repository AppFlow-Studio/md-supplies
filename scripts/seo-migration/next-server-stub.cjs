// Minimal stand-in for 'next/server' sufficient to exercise proxy.ts's
// redirect logic outside a Next.js runtime, for the READ-ONLY simulation
// scripts in this directory only.
class NextResponse {
  static redirect(url, status) {
    return new Response(null, { status, headers: { Location: url.toString() } })
  }
  static next(_init) {
    return { headers: new Map(), cookies: { set: () => {} } }
  }
}
module.exports = { NextResponse }
