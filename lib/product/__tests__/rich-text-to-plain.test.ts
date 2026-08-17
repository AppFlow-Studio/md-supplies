import { describe, it, expect } from 'vitest'
import { richTextToPlainText } from '../rich-text-to-plain'

// Confirmed live 2026-08-17 against the QA store: Izzy created
// custom.variant_description as Shopify's native "Rich text" metafield type
// (not the "Multi-line text" type docs/launch/2026-08-14-variant-field-contract.md
// proposed). The raw .value for the AeroWalk pilot's Blue variant is:
//   {"type":"root","children":[{"type":"paragraph","children":[{"type":"text","value":"Blue frame with matching fork covers."}]}]}
// Rendered as-is (the pre-fix behavior), that JSON prints verbatim on the PDP.
// custom.shipping_returns (H-01) is named "rich text" directly in Bilal's
// launch-direction message, so it is expected to carry the same shape once
// Izzy writes real data — this parser is shared by both fields.
describe('richTextToPlainText', () => {
  it('returns null for null input', () => {
    expect(richTextToPlainText(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(richTextToPlainText(undefined)).toBeNull()
  })

  it('extracts plain text from a single Shopify rich_text paragraph', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Blue frame with matching fork covers.' }] }],
    })
    expect(richTextToPlainText(raw)).toBe('Blue frame with matching fork covers.')
  })

  it('joins multiple paragraphs with a blank line so whitespace-pre-line shows a visible break', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [
        { type: 'paragraph', children: [{ type: 'text', value: 'First paragraph.' }] },
        { type: 'paragraph', children: [{ type: 'text', value: 'Second paragraph.' }] },
      ],
    })
    expect(richTextToPlainText(raw)).toBe('First paragraph.\n\nSecond paragraph.')
  })

  it('concatenates multiple text runs within one paragraph (e.g. bold + plain marks)', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [{
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Ships via ', bold: false },
          { type: 'text', value: 'Drive Medical freight', bold: true },
          { type: 'text', value: '.', bold: false },
        ],
      }],
    })
    expect(richTextToPlainText(raw)).toBe('Ships via Drive Medical freight.')
  })

  it('extracts text out of a link node without printing the URL', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [{
        type: 'paragraph',
        children: [
          { type: 'text', value: 'See our ' },
          { type: 'link', url: 'https://example.com/policy', children: [{ type: 'text', value: 'return policy' }] },
          { type: 'text', value: ' for details.' },
        ],
      }],
    })
    expect(richTextToPlainText(raw)).toBe('See our return policy for details.')
  })

  it('extracts list items on their own lines', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [{
        type: 'list',
        listType: 'unordered',
        children: [
          { type: 'list-item', children: [{ type: 'text', value: 'RGA required for freight items' }] },
          { type: 'list-item', children: [{ type: 'text', value: '30-day return window' }] },
        ],
      }],
    })
    expect(richTextToPlainText(raw)).toBe('RGA required for freight items\n30-day return window')
  })

  it('passes a genuinely plain (non-JSON) string through unchanged — Multi-line text fields must not be mangled', () => {
    expect(richTextToPlainText('Includes an extra-wide seat pad not on other colors.'))
      .toBe('Includes an extra-wide seat pad not on other colors.')
  })

  it('passes through unchanged when the string parses as JSON but is not the rich_text shape', () => {
    expect(richTextToPlainText('"just a quoted plain value"')).toBe('"just a quoted plain value"')
  })
})
