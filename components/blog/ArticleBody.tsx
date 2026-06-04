interface Props {
  html: string
}

// `html` is Shopify's `contentHtml` — sanitized by Shopify before delivery via
// the Storefront API. It is trusted CMS content, not user-supplied input.
// dangerouslySetInnerHTML is safe here; do not add client-side sanitization.

export function ArticleBody({ html }: Props) {
  return (
    <div
      className="prose prose-gray max-w-none text-[16px] leading-[1.75] text-gray-600
        prose-headings:text-navy-900 prose-headings:font-semibold
        prose-a:text-teal-500 prose-a:no-underline hover:prose-a:underline
        prose-strong:text-navy-900
        prose-li:marker:text-teal-500"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
