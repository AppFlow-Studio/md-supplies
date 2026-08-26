/**
 * Regenerates the committed raster brand assets:
 *
 *   app/apple-icon.png          180x180  Apple touch icon
 *   public/og/mdsupplies-og.png 1200x630 default social sharing card
 *
 * Run: node scripts/generate-brand-assets.mjs
 *
 * Both outputs are COMMITTED — this script exists so they can be reproduced and
 * reviewed, not so they can be built on demand. It uses Playwright, which is
 * already a devDependency for the e2e suite, so no production dependency is
 * added to ship one image. Nothing here runs at build or request time.
 *
 * Brand colours are sampled from public/images/logo.png:
 *   badge #23347c · cross #03b5d3 -> #0c91bc · wordmark navy #253372
 */
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOGO = path.join(ROOT, 'public', 'images', 'logo.png')

const logoDataUri = `data:image/png;base64,${fs.readFileSync(LOGO).toString('base64')}`

// The site's UI font. Loaded from Google Fonts at generation time only; if it
// is unavailable the stack below degrades to a system sans rather than failing.
const FONT_LINK =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;700;800&display=swap">'
const FONT_STACK =
  "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

const APPLE_ICON = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0}
  body{width:180px;height:180px;background:#23347c;display:flex;align-items:center;justify-content:center}
  /* Full-bleed navy tile: iOS masks the corners itself, and a transparent or
     white-cornered icon reads as broken on a home screen. */
  svg{display:block}
</style></head><body>
  <svg width="122" height="122" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#03b5d3"/><stop offset="1" stop-color="#0c91bc"/>
    </linearGradient></defs>
    <path fill="url(#c)" d="M39.5 17h21v22h22v21h-22v22h-21V60h-22V39h22z"/>
  </svg>
</body></html>`

const OG_CARD = `<!doctype html><html><head><meta charset="utf-8">${FONT_LINK}<style>
  html,body{margin:0;padding:0}
  body{
    width:1200px;height:630px;background:#ffffff;
    font-family:${FONT_STACK};
    display:flex;flex-direction:column;justify-content:center;
    padding:0 90px;box-sizing:border-box;position:relative;
  }
  /* Brand bar down the left edge — keeps the card from reading as a blank
     document in a Slack/iMessage preview without adding decorative noise. */
  .edge{position:absolute;left:0;top:0;bottom:0;width:18px;
        background:linear-gradient(180deg,#23347c 0%,#03b5d3 100%);}
  .logo{width:392px;height:auto;display:block;margin-bottom:54px}
  h1{
    font-size:62px;line-height:1.14;font-weight:800;color:#0b172b;
    margin:0 0 30px;max-width:1000px;letter-spacing:-0.5px;
  }
  p{
    font-size:27px;line-height:1.4;font-weight:500;color:#41506b;
    margin:0;max-width:960px;
  }
  .rule{width:96px;height:6px;background:#03b5d3;margin:0 0 34px;border-radius:3px}
</style></head><body>
  <div class="edge"></div>
  <img class="logo" src="${logoDataUri}" alt="MDSupplies">
  <div class="rule"></div>
  <h1>Medical Supplies for Clinics, Facilities &amp; Everyday Orders</h1>
  <p>Clinical &middot; Home Care &middot; Testing &middot; Mobility &middot; Everyday Medical Supplies</p>
</body></html>`

async function shoot(browser, { html, width, height, out }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  await page.setContent(html, { waitUntil: 'load' })
  // Let webfonts settle so the card is never captured mid-swap.
  await page.evaluate(() => document.fonts?.ready).catch(() => {})
  await page.waitForTimeout(400)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  await page.screenshot({ path: out, type: 'png' })
  await page.close()
  const kb = (fs.statSync(out).size / 1024).toFixed(1)
  console.log(`  wrote ${path.relative(ROOT, out).replace(/\\/g, '/')}  ${width}x${height}  ${kb} KB`)
}

const browser = await chromium.launch()
try {
  await shoot(browser, {
    html: APPLE_ICON, width: 180, height: 180,
    out: path.join(ROOT, 'app', 'apple-icon.png'),
  })
  await shoot(browser, {
    html: OG_CARD, width: 1200, height: 630,
    out: path.join(ROOT, 'public', 'og', 'mdsupplies-og.png'),
  })
} finally {
  await browser.close()
}
