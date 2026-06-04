interface Props {
  html: string
}

function extractParagraphs(html: string): string[] {
  return html
    .replace(/<\/?(p|br)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function ProductDescription({ html }: Props) {
  const paragraphs = extractParagraphs(html)
  if (paragraphs.length === 0) return null

  return (
    <section aria-labelledby="description-heading" className="border-t border-gray-200 pt-8">
      <h2 id="description-heading" className="text-xl font-semibold text-navy-900 mb-4">
        Product Details
      </h2>
      <div className="flex flex-col gap-3 max-w-prose">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-sm text-gray-500 leading-relaxed">
            {para}
          </p>
        ))}
      </div>
    </section>
  )
}
