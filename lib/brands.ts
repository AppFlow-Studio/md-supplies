export function slugifyVendor(vendor: string): string {
  return vendor
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function unslugifyVendor(slug: string, vendors: string[]): string | undefined {
  return vendors.find((v) => slugifyVendor(v) === slug)
}
