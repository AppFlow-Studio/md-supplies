import { NextResponse } from 'next/server'
import { SOURCING_TO_EMAIL } from '@/lib/resend'
import { sourcingSchema } from '@/lib/forms/schema'
import { sendFormEmail } from '@/lib/forms/email'
import {
  assertAllowedOrigin,
  readJsonBounded,
  sanitizeHeaderValue,
  fieldErrors,
  isHoneypotFilled,
} from '@/lib/forms/guards'

export async function POST(req: Request) {
  const origin = assertAllowedOrigin(req)
  if (!origin.ok) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
  }

  const read = await readJsonBounded(req)
  if (!read.ok) {
    const error = read.status === 413 ? 'Payload too large' : 'Invalid JSON'
    return NextResponse.json({ error }, { status: read.status })
  }

  // Silently accept (but never send) bot submissions that trip the honeypot,
  // so scrapers can't distinguish a drop from a success.
  if (isHoneypotFilled(read.data)) {
    return NextResponse.json({ ok: true })
  }

  const parsed = sourcingSchema.safeParse(read.data)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: fieldErrors(parsed.error) },
      { status: 400 },
    )
  }

  const { name, email, phone, facultyType } = parsed.data

  const sent = await sendFormEmail({
    to: SOURCING_TO_EMAIL,
    replyTo: sanitizeHeaderValue(email),
    subject: sanitizeHeaderValue(`[Sourcing Request] ${facultyType} — ${name}`),
    text: [
      `Name:          ${name}`,
      `Email:         ${email}`,
      `Phone:         ${phone || '—'}`,
      `Facility Type: ${facultyType}`,
    ].join('\n'),
    formName: 'sourcing',
  })

  if (!sent.ok) {
    return NextResponse.json({ error: 'Email delivery failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
