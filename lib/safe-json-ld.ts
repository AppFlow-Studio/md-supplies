/**
 * Serializes a schema object for use in a <script type="application/ld+json"> tag.
 * JSON.stringify alone does not escape characters that can break out of an HTML
 * script block. Escapes </script>, &, and Unicode line terminators.
 */
export function safeJsonLd(schema: unknown): string {
  return JSON.stringify(schema)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}
