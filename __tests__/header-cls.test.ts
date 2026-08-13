import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const src = fs.readFileSync(path.resolve(__dirname, '../components/layout/Header.tsx'), 'utf-8')

describe('Header announcement/stats bars reserve fixed height (no CLS on rotation)', () => {
  it('announcement bar has a fixed height class', () => {
    // The className is now a template literal: the fixed height and the layout
    // mode are static, and only the route-dependent display class
    // (announcementBarClass) is interpolated.
    const match = src.match(/Announcement bar[\s\S]{0,200}?className=\{`(bg-navy-900[^`]*)`\}/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/\bh-\d/)
  })

  it('announcement bar visibility comes from the route registry, not an inline check', () => {
    // Route matching lives in lib/announcement-visibility.ts so the
    // trailing-slash / nested-path edge cases are unit-tested on their own.
    expect(src).toMatch(/announcementBarClass\(pathname\)/)
  })

  it('stats bar has a fixed height class', () => {
    const match = src.match(/Stats bar[\s\S]{0,200}?className="(hidden md:flex[^"]*)"/)
    expect(match).not.toBeNull()
    expect(match![1]).toMatch(/\bh-\d/)
  })
})
