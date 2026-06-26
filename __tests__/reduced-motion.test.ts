import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function read(file: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8')
}

describe('prefers-reduced-motion is respected sitewide', () => {
  it('globals.css has a prefers-reduced-motion override', () => {
    expect(read('app/globals.css')).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })

  it('root layout wraps the app in MotionConfig reducedMotion="user"', () => {
    const src = read('app/layout.tsx')
    expect(src).toMatch(/MotionConfig/)
    expect(src).toMatch(/reducedMotion=["']user["']/)
  })
})
