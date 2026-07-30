import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { SITE_CONTACT } from '../site-contact'

/**
 * IZ-COMMS-01: support@mdsupplies.com is the only approved MDSupplies support
 * address, and it must be the one the site shows and sends to.
 *
 * This exists because the site had drifted into showing THREE addresses at once:
 * team@ in the footer, /contact and the Organization schema (all from
 * SITE_CONTACT), support@ hardcoded in the FAQ, and a sourcing inbox besides.
 * Production Shopify meanwhile reports support@ as shop.email, so the site was
 * contradicting the store it sells for.
 *
 * A constant alone did not prevent that, because the FAQ hardcoded its own copy.
 * So this checks the source tree, not just the constant.
 */
const APPROVED = 'support@mdsupplies.com'
const FORBIDDEN = ['team@mdsupplies.com', 'mbsupplies', 'mdysupplies']
const ROOTS = ['app', 'components', 'lib']
const SKIP_DIRS = new Set(['node_modules', '.next', '__tests__', 'docs'])

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) sourceFiles(full, out)
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full)
  }
  return out
}

describe('support address', () => {
  it('is the approved one in the single source of truth', () => {
    expect(SITE_CONTACT.email).toBe(APPROVED)
  })

  it.each(FORBIDDEN)('does not appear anywhere in shipped source: %s', (bad) => {
    const offenders = ROOTS.flatMap((r) => sourceFiles(r)).filter((f) =>
      readFileSync(f, 'utf8').toLowerCase().includes(bad.toLowerCase()),
    )
    expect(offenders, `forbidden address ${bad} found in: ${offenders.join(', ')}`).toEqual([])
  })

  it('is not hardcoded outside its two permitted homes, so it cannot drift again', () => {
    // The FAQ page previously hardcoded its own copy of the address, which is how
    // the site came to show two different ones. Anything needing it must import it.
    //
    // env.server.ts is permitted: it supplies the RESEND_TO_EMAIL fallback, and a
    // low-level env module reading a presentation constant would invert the
    // dependency for no benefit.
    const PERMITTED = [join('lib', 'site-contact.ts'), join('lib', 'env.server.ts')]
    const offenders = ROOTS.flatMap((r) => sourceFiles(r)).filter(
      (f) => !PERMITTED.some((p) => f.endsWith(p)) &&
        readFileSync(f, 'utf8').includes(APPROVED),
    )
    expect(offenders, `hardcoded address in: ${offenders.join(', ')}`).toEqual([])
  })
})
