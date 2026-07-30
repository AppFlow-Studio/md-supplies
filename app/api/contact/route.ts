import { NextResponse } from 'next/server'
import { TO_EMAIL } from '@/lib/resend'
import { contactSchema } from '@/lib/forms/schema'
import { sendFormEmail } from '@/lib/forms/email'
import {
  assertAllowedOrigin,
  assertAllowedCountry,
  readJsonBounded,
  sanitizeHeaderValue,
  fieldErrors,
  isHoneypotFilled,
  isSubmittedTooFast,
} from '@/lib/forms/guards'

export async function POST(req: Request) {
  const origin = assertAllowedOrigin(req)
  if (!origin.ok) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
  }

  const country = assertAllowedCountry(req)
  if (!country.ok) {
    return NextResponse.json(
      { error: 'This form is only available to customers in the United States and Canada.' },
      { status: 403 },
    )
  }

  const read = await readJsonBounded(req)
  if (!read.ok) {
    const error = read.status === 413 ? 'Payload too large' : 'Invalid JSON'
    return NextResponse.json({ error }, { status: read.status })
  }

  // Silently accept (but never send) bot submissions that trip the honeypot or
  // submit too fast to be human, so scripted clients can't tell a drop from a
  // real send.
  if (isHoneypotFilled(read.data) || isSubmittedTooFast(read.data)) {
    return NextResponse.json({ ok: true })
  }

  const parsed = await contactSchema.safeParseAsync(read.data)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', fields: fieldErrors(parsed.error) },
      { status: 400 },
    )
  }

  const { name, email, subject, message } = parsed.data

  const sent = await sendFormEmail({
    to: TO_EMAIL,
    replyTo: sanitizeHeaderValue(email),
    subject: subject
      ? sanitizeHeaderValue(`[Contact] ${subject}`)
      : '[Contact] New message from MDSupplies',
    text: [
      `Name:    ${name}`,
      `Email:   ${email}`,
      `Subject: ${subject || '—'}`,
      '',
      message,
    ].join('\n'),
    formName: 'contact',
  })

  if (!sent.ok) {
    return NextResponse.json({ error: 'Email delivery failed' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
