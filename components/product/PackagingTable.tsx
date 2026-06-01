import type { Product } from '@/types/product'

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

interface Props {
  product: Pick<
    Product,
    'unitsPerBox' | 'boxesPerCase' | 'totalUnits' | 'sellingUnit' | 'unitPriceEach' | 'unitPriceBox' | 'unitPriceCase'
  >
}

export function PackagingTable({ product }: Props) {
  const rows: { label: string; value: string }[] = []

  if (product.unitsPerBox) rows.push({ label: 'Units per Box', value: String(product.unitsPerBox) })
  if (product.boxesPerCase) rows.push({ label: 'Boxes per Case', value: String(product.boxesPerCase) })
  if (product.totalUnits) rows.push({ label: 'Total Units per Case', value: String(product.totalUnits) })
  if (product.sellingUnit) rows.push({ label: 'Selling Unit', value: product.sellingUnit })
  if (product.unitPriceEach) rows.push({ label: 'Price per Unit', value: formatCents(product.unitPriceEach) })
  if (product.unitPriceBox) rows.push({ label: 'Price per Box', value: formatCents(product.unitPriceBox) })
  if (product.unitPriceCase) rows.push({ label: 'Price per Case', value: formatCents(product.unitPriceCase) })

  if (rows.length === 0) return null

  return (
    <section aria-labelledby="packaging-heading" className="border-t border-gray-200 pt-8">
      <h2 id="packaging-heading" className="text-xl font-semibold text-navy-900 mb-4">
        Packaging
      </h2>
      <table className="w-full text-sm border-collapse">
        <tbody>
          {rows.map(({ label, value }) => (
            <tr key={label} className="border-b border-gray-200">
              <th
                scope="row"
                className="text-left py-2.5 pr-4 font-medium text-navy-900 w-1/2 sm:w-2/5"
              >
                {label}
              </th>
              <td className="py-2.5 text-gray-500">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
