export { buildOrganizationSchema } from './organization'
export { buildWebSiteSchema } from './website'
export { buildCollectionPageSchema } from './collection'
export { buildBreadcrumbListSchema } from './breadcrumb'

// Prevents </script> injection: JSON.stringify does not escape < > & by default.
// A collection title of "test</script>" would break out of the script element.
export function jsonLdSafe(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}
