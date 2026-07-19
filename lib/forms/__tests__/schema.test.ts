import { describe, it, expect, vi, beforeEach } from 'vitest'

const resolveMx = vi.fn()
const resolve4 = vi.fn()
const resolve6 = vi.fn()

vi.mock('node:dns/promises', () => ({
  resolveMx: (...args: unknown[]) => resolveMx(...args),
  resolve4: (...args: unknown[]) => resolve4(...args),
  resolve6: (...args: unknown[]) => resolve6(...args),
}))

import { sourcingSchema, contactSchema, FACILITY_TYPES, SUBJECTS } from '@/lib/forms/schema'

beforeEach(() => {
  resolveMx.mockReset().mockResolvedValue([{ exchange: 'mx.clinic.com', priority: 10 }])
  resolve4.mockReset()
  resolve6.mockReset()
})

describe('sourcingSchema', () => {
  const valid = {
    name: 'Dr. Jane Smith',
    email: 'jane@clinic.com',
    phone: '+1 (212) 555-0100',
    facultyType: FACILITY_TYPES[0],
  }

  it('accepts a valid payload', async () => {
    expect((await sourcingSchema.safeParseAsync(valid)).success).toBe(true)
  })

  it('accepts a payload without the optional phone', async () => {
    const { phone, ...rest } = valid
    void phone
    expect((await sourcingSchema.safeParseAsync(rest)).success).toBe(true)
  })

  it('accepts a payload with elapsedMs', async () => {
    expect((await sourcingSchema.safeParseAsync({ ...valid, elapsedMs: 2000 })).success).toBe(true)
  })

  it('rejects an invalid email format', async () => {
    const result = await sourcingSchema.safeParseAsync({ ...valid, email: 'not-an-email' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'email')).toBe(true)
    }
  })

  it('rejects an email whose domain has no mail records', async () => {
    const err = Object.assign(new Error('nope'), { code: 'ENOTFOUND' })
    resolveMx.mockRejectedValue(err)
    resolve4.mockRejectedValue(err)
    resolve6.mockRejectedValue(err)
    const result = await sourcingSchema.safeParseAsync({ ...valid, email: 'jane@no-mail-here.test' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'email')).toBe(true)
    }
  })

  it('rejects a fake NANP phone number', async () => {
    const result = await sourcingSchema.safeParseAsync({ ...valid, phone: '+1 (555) 000-0000' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'phone')).toBe(true)
    }
  })

  it('rejects a missing name', async () => {
    expect((await sourcingSchema.safeParseAsync({ ...valid, name: '' })).success).toBe(false)
  })

  it('rejects a facultyType outside the enum', async () => {
    expect(
      (await sourcingSchema.safeParseAsync({ ...valid, facultyType: 'Spaceship Bay' })).success,
    ).toBe(false)
  })

  it('rejects unknown fields (.strict)', async () => {
    expect((await sourcingSchema.safeParseAsync({ ...valid, role: 'admin' })).success).toBe(false)
  })

  it('rejects a non-empty honeypot website field', async () => {
    expect(
      (await sourcingSchema.safeParseAsync({ ...valid, website: 'http://spam' })).success,
    ).toBe(false)
  })

  it('accepts an empty honeypot website field', async () => {
    expect((await sourcingSchema.safeParseAsync({ ...valid, website: '' })).success).toBe(true)
  })

  it('rejects an over-long name', async () => {
    expect(
      (await sourcingSchema.safeParseAsync({ ...valid, name: 'a'.repeat(121) })).success,
    ).toBe(false)
  })
})

describe('contactSchema', () => {
  const valid = {
    name: 'Dr. Jane Smith',
    email: 'jane@clinic.com',
    subject: SUBJECTS[0],
    message: 'Hello, I have a question about pricing.',
  }

  it('accepts a valid payload', async () => {
    expect((await contactSchema.safeParseAsync(valid)).success).toBe(true)
  })

  it('accepts a payload without the optional subject', async () => {
    const { subject, ...rest } = valid
    void subject
    expect((await contactSchema.safeParseAsync(rest)).success).toBe(true)
  })

  it('treats an empty subject string as no subject', async () => {
    const result = await contactSchema.safeParseAsync({ ...valid, subject: '' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.subject).toBeUndefined()
  })

  it('rejects a missing message', async () => {
    expect((await contactSchema.safeParseAsync({ ...valid, message: '' })).success).toBe(false)
  })

  it('rejects a subject outside the enum', async () => {
    expect((await contactSchema.safeParseAsync({ ...valid, subject: 'Nope' })).success).toBe(false)
  })

  it('rejects unknown fields (.strict)', async () => {
    expect((await contactSchema.safeParseAsync({ ...valid, extra: 1 })).success).toBe(false)
  })

  it('rejects a non-empty honeypot website field', async () => {
    expect((await contactSchema.safeParseAsync({ ...valid, website: 'x' })).success).toBe(false)
  })

  it('rejects an over-long message', async () => {
    expect(
      (await contactSchema.safeParseAsync({ ...valid, message: 'a'.repeat(5001) })).success,
    ).toBe(false)
  })
})
