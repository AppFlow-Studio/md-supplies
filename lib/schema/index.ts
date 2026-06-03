export { buildOrganizationSchema } from './organization'
export { buildWebSiteSchema } from './website'
export { buildCollectionPageSchema } from './collection'
export { buildBreadcrumbListSchema } from './breadcrumb'

export function jsonLdSafe(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\u003c')
    .replace(/>/g, '\u003e')
    .replace(/&/g, '\u0026')
    .replace(new RegExp('\u2028', 'g'), '\u2028')
    .replace(new RegExp('\u2029', 'g'), '\u2029')
}
