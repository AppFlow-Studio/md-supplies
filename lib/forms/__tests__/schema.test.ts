import { describe, it, expect } from 'vitest'
import {
  sourcingSchema,
  contactSchema,
  FACILITY_TYPES,
  SUBJECTS,
} from '@/lib/forms/schema'

describe('sourcingSchema', () => {
  const valid = {
    name: 'Dr. Jane Smith',
    email: 'jane@clinic.com',
    phone: '+1 (555) 000-0000',
    facultyType: FACILITY_TYPES[0],
  }

  it('accepts a valid payload', () => {
    expect(sourcingSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts a payload without the optional phone', () => {
    const { phone, ...rest } = valid
    void phone
    expect(sourcingSchema.safeParse(rest).success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const result = sourcingSchema.safeParse({ ...valid, email: 'not-an-email' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'email')).toBe(true)
    }
  })

  it('rejects a missing name', () => {
    expect(sourcingSchema.safeParse({ ...valid, name: '' }).success).toBe(false)
  })

  it('rejects a facultyType outside the enum', () => {
    expect(
      sourcingSchema.safeParse({ ...valid, facultyType: 'Spaceship Bay' }).success,
    ).toBe(false)
  })

  it('rejects unknown fields (.strict)', () => {
    expect(sourcingSchema.safeParse({ ...valid, role: 'admin' }).success).toBe(false)
  })

  it('rejects a non-empty honeypot website field', () => {
    expect(sourcingSchema.safeParse({ ...valid, website: 'http://spam' }).success).toBe(
      false,
    )
  })

  it('accepts an empty honeypot website field', () => {
    expect(sourcingSchema.safeParse({ ...valid, website: '' }).success).toBe(true)
  })

  it('rejects an over-long name', () => {
    expect(sourcingSchema.safeParse({ ...valid, name: 'a'.repeat(121) }).success).toBe(
      false,
    )
  })
})

describe('contactSchema', () => {
  const valid = {
    name: 'Dr. Jane Smith',
    email: 'jane@clinic.com',
    subject: SUBJECTS[0],
    message: 'Hello, I have a question about pricing.',
  }

  it('accepts a valid payload', () => {
    expect(contactSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts a payload without the optional subject', () => {
    const { subject, ...rest } = valid
    void subject
    expect(contactSchema.safeParse(rest).success).toBe(true)
  })

  it('treats an empty subject string as no subject', () => {
    const result = contactSchema.safeParse({ ...valid, subject: '' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.subject).toBeUndefined()
  })

  it('rejects a missing message', () => {
    expect(contactSchema.safeParse({ ...valid, message: '' }).success).toBe(false)
  })

  it('rejects a subject outside the enum', () => {
    expect(contactSchema.safeParse({ ...valid, subject: 'Nope' }).success).toBe(false)
  })

  it('rejects unknown fields (.strict)', () => {
    expect(contactSchema.safeParse({ ...valid, extra: 1 }).success).toBe(false)
  })

  it('rejects a non-empty honeypot website field', () => {
    expect(contactSchema.safeParse({ ...valid, website: 'x' }).success).toBe(false)
  })

  it('rejects an over-long message', () => {
    expect(
      contactSchema.safeParse({ ...valid, message: 'a'.repeat(5001) }).success,
    ).toBe(false)
  })
})
