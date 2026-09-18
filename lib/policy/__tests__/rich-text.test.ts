import { describe, it, expect } from 'vitest'
import { shopifyRichTextToPlainParagraphs, shopifyRichTextToParagraphSpans, shopifyRichTextToHtml, plainTextToHtml } from '../rich-text'

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

describe('shopifyRichTextToParagraphSpans', () => {
  it('preserves bold marks within a paragraph as separate spans', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [{
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Returns accepted within ' },
          { type: 'text', value: '30 days', bold: true },
          { type: 'text', value: ' of delivery.' },
        ],
      }],
    })
    const paragraphs = shopifyRichTextToParagraphSpans(raw)
    expect(paragraphs).toEqual([
      [
        { text: 'Returns accepted within ', bold: false },
        { text: '30 days', bold: true },
        { text: ' of delivery.', bold: false },
      ],
    ])
  })

  it('degrades malformed/non-JSON input to an empty array, matching the plain-text function', () => {
    expect(shopifyRichTextToParagraphSpans('not json')).toEqual([])
    expect(shopifyRichTextToParagraphSpans(null)).toEqual([])
  })

  it('splits into separate paragraphs on a blank line within a single AST paragraph node, matching resolveReturnPolicy\'s plain-text split (real custom.shipping_returns QA data stores two logical paragraphs this way, confirmed 2026-08-19)', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [{
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Shipping Policy: ', bold: true },
          { type: 'text', value: 'Free ground shipping.\n\n' },
          { type: 'text', value: 'Return Policy:', bold: true },
          { type: 'text', value: '\nCustomer pays return freight.' },
        ],
      }],
    })
    expect(shopifyRichTextToParagraphSpans(raw)).toEqual([
      [
        { text: 'Shipping Policy: ', bold: true },
        { text: 'Free ground shipping.', bold: false },
      ],
      [
        { text: 'Return Policy:', bold: true },
        { text: '\nCustomer pays return freight.', bold: false },
      ],
    ])
  })
})

describe('shopifyRichTextToHtml', () => {
  it('returns null for null/undefined/empty/malformed input', () => {
    expect(shopifyRichTextToHtml(null)).toBeNull()
    expect(shopifyRichTextToHtml(undefined)).toBeNull()
    expect(shopifyRichTextToHtml('')).toBeNull()
    expect(shopifyRichTextToHtml('not json')).toBeNull()
  })

  it('renders a paragraph as <p>', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Ships within 2 business days.' }] }],
    })
    expect(shopifyRichTextToHtml(raw)).toBe('<p>Ships within 2 business days.</p>')
  })

  it('preserves bold and italic as <strong>/<em> instead of flattening to plain text', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [{
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Contact ' },
          { type: 'text', value: 'support', bold: true },
          { type: 'text', value: ' before ' },
          { type: 'text', value: 'returning', italic: true },
          { type: 'text', value: '.' },
        ],
      }],
    })
    expect(shopifyRichTextToHtml(raw)).toBe('<p>Contact <strong>support</strong> before <em>returning</em>.</p>')
  })

  it('renders a heading clamped to h3, and a list as <ul>/<li>', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [
        { type: 'heading', level: 1, children: [{ type: 'text', value: 'Returns' }] },
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
    expect(shopifyRichTextToHtml(raw)).toBe(
      '<h3>Returns</h3><ul><li>RGA required</li><li>Buyer pays return shipping</li></ul>',
    )
  })

  it('renders an ordered list as <ol>', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [{
        type: 'list',
        listType: 'ordered',
        children: [
          { type: 'list-item', children: [{ type: 'paragraph', children: [{ type: 'text', value: 'Step one' }] }] },
        ],
      }],
    })
    expect(shopifyRichTextToHtml(raw)).toBe('<ol><li>Step one</li></ol>')
  })

  it('renders a link with a safe href, target=_blank and rel=noopener', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [{
        type: 'paragraph',
        children: [{ type: 'link', url: 'https://example.com/sizing', children: [{ type: 'text', value: 'sizing guide' }] }],
      }],
    })
    expect(shopifyRichTextToHtml(raw)).toBe(
      '<p><a href="https://example.com/sizing" target="_blank" rel="noopener noreferrer">sizing guide</a></p>',
    )
  })

  it('degrades a javascript: link href to "#" rather than trusting it into innerHTML', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [{
        type: 'paragraph',
        children: [{ type: 'link', url: 'javascript:alert(1)', children: [{ type: 'text', value: 'click me' }] }],
      }],
    })
    expect(shopifyRichTextToHtml(raw)).toBe('<p><a href="#" target="_blank" rel="noopener noreferrer">click me</a></p>')
  })

  it('HTML-escapes text content so a value containing markup cannot inject tags', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: '<img src=x onerror=alert(1)>' }] }],
    })
    expect(shopifyRichTextToHtml(raw)).toBe('<p>&lt;img src=x onerror=alert(1)&gt;</p>')
  })

  it('splits a blank line inside one AST paragraph into two <p> blocks (matches real custom.shipping_returns-style QA data)', () => {
    const raw = JSON.stringify({
      type: 'root',
      children: [{
        type: 'paragraph',
        children: [
          { type: 'text', value: 'Shipping Policy: ', bold: true },
          { type: 'text', value: 'Free ground shipping.\n\n' },
          { type: 'text', value: 'Return Policy:', bold: true },
        ],
      }],
    })
    expect(shopifyRichTextToHtml(raw)).toBe(
      '<p><strong>Shipping Policy: </strong>Free ground shipping.</p><p><strong>Return Policy:</strong></p>',
    )
  })

  it('returns null for an AST with no renderable content', () => {
    const raw = JSON.stringify({ type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', value: '   ' }] }] })
    expect(shopifyRichTextToHtml(raw)).toBeNull()
  })
})

describe('plainTextToHtml', () => {
  it('wraps a single line in <p>', () => {
    expect(plainTextToHtml('Ships within 2 business days.')).toBe('<p>Ships within 2 business days.</p>')
  })

  it('splits blank-line-separated text into separate <p> blocks and a single newline into <br/>', () => {
    expect(plainTextToHtml('Line one.\nLine two.\n\nSecond paragraph.')).toBe(
      '<p>Line one.<br/>Line two.</p><p>Second paragraph.</p>',
    )
  })

  it('HTML-escapes content', () => {
    expect(plainTextToHtml('<b>bold</b>')).toBe('<p>&lt;b&gt;bold&lt;/b&gt;</p>')
  })

  it('returns null for empty/whitespace-only input', () => {
    expect(plainTextToHtml('')).toBeNull()
    expect(plainTextToHtml('   ')).toBeNull()
  })
})
