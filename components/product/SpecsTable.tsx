import type { Product } from '@/types/product'

interface Props {
  product: Pick<Product, 'specifications'>
}

export function SpecsTable({ product }: Props) {
  const specs = product.specifications.filter((s) => s.label && s.value)

  if (specs.length === 0) return null

  return (
    <section aria-labelledby="specs-heading" className="border-t border-gray-200 pt-8">
      <h2 id="specs-heading" className="text-xl font-semibold text-navy-900 mb-4">
        Specifications
      </h2>
      <table className="w-full text-sm border-collapse">
        <tbody>
          {specs.map(({ label, value }) => (
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
