import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, facultyType } = body

    if (!name || !email || !facultyType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // TODO: wire to email provider (Resend, SendGrid, etc.)
    // The form payload (name, email, phone, facultyType) is validated above and ready to forward.
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
