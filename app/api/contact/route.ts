import { NextResponse } from 'next/server'
import { getResend, FROM_EMAIL, TO_EMAIL } from '@/lib/resend'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, subject, message } = body as Record<string, string>

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await getResend().emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: email,
      subject: subject ? `[Contact] ${subject}` : '[Contact] New message from MDSupplies',
      text: [
        `Name:    ${name}`,
        `Email:   ${email}`,
        `Subject: ${subject || '—'}`,
        '',
        message,
      ].join('\n'),
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
