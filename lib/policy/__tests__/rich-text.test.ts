import { describe, it, expect } from 'vitest'
import { shopifyRichTextToPlainParagraphs } from '../rich-text'

describe('shopifyRichTextToPlainParagraphs', () => {
  it('returns [] for null/undefined/empty input', () => {
    expect(shopifyRichTextToPlainParagraphs(null)).toEqual([])
    expect(shopifyRichTextToPlainParagraphs(undefined)).toEqual([])
    expect(shopifyRichTextToPlainParagraphs('')).toEqual([])
  })

  it('returns [] rather than throwing on malformed JSON', () => {
    expect(shopifyRichTextToPlainParagraphs('not json')).toEqual([])
  })

  it('flattens a single paragraph', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [
        { type: 'paragraph', children: [{ type: 'text', value: 'Ships within 2 business days.' }] },
      ],
    })
    expect(shopifyRichTextToPlainParagraphs(raw)).toEqual(['Ships within 2 business days.'])
  })

  it('strips inline formatting to plain text and keeps block order', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [
        { type: 'heading', level: 2, children: [{ type: 'text', value: 'Returns' }] },
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'Contact ' },
            { type: 'text', value: 'support', bold: true },
            { type: 'text', value: ' before returning.' },
          ],
        },
      ],
    })
    expect(shopifyRichTextToPlainParagraphs(raw)).toEqual([
      'Returns',
      'Contact support before returning.',
    ])
  })

  it('flattens each list item into its own paragraph', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [
        {
          type: 'list',
          listType: 'unordered',
          children: [
            { type: 'list-item', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'RGA required' }] }] },
            { type: 'list-item', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Buyer pays return shipping' }] }] },
          ],
        },
      ],
    })
    expect(shopifyRichTextToPlainParagraphs(raw)).toEqual(['RGA required', 'Buyer pays return shipping'])
  })

  it('drops empty/whitespace-only blocks', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [
        { type: 'paragraph', children: [{ type: 'text', value: '   ' }] },
        { type: 'paragraph', children: [{ type: 'text', value: 'Real content.' }] },
      ],
    })
    expect(shopifyRichTextToPlainParagraphs(raw)).toEqual(['Real content.'])
  })
})
