import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// The Contact flow must not promise a response deadline the business has not
// committed to. Asserted against the source rather than a render so the intro
// copy (a server component) and the success state (a client component branch)
// are both covered by one check that cannot be satisfied by a stale snapshot.

const page = fs.readFileSync(path.resolve(__dirname, '../page.tsx'), 'utf-8')
const form = fs.readFileSync(path.resolve(__dirname, '../ContactForm.tsx'), 'utf-8')

const DEADLINE_PROMISES = [
  /one business day/i,
  /1 business day/i,
  /one-business-day/i,
  /next business day/i,
  /within \d+ hours?/i,
  /same day/i,
  /guaranteed response/i,
]

describe('Contact page makes no unsupported response-time promise', () => {
  it('has the approved intro copy', () => {
    expect(page).toContain(
      'Fill out the form and our team will get back to you as soon as possible.',
    )
  })

  it('has the approved success state', () => {
    expect(form).toContain('Message received — our team will be in touch as soon as possible.')
  })

  it('contains no response-deadline promise in either file', () => {
    for (const pattern of DEADLINE_PROMISES) {
      expect(page, `intro: ${pattern}`).not.toMatch(pattern)
      expect(form, `success: ${pattern}`).not.toMatch(pattern)
    }
  })
})
