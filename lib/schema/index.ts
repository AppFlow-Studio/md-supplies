export { buildOrganizationSchema } from './organization'
export { buildWebSiteSchema } from './website'
export { buildCollectionPageSchema } from './collection'
export { buildBreadcrumbListSchema } from './breadcrumb'

// Re-export the canonical safe serializer so callers import from one place.
// safeJsonLd also escapes Unicode line terminators (U+2028, U+2029) which
// can break JSON parsing in some environments if left unescaped.
export { safeJsonLd as jsonLdSafe } from '@/lib/safe-json-ld'
