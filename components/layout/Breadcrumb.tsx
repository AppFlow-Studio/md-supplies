import { Fragment } from 'react'
import Link from 'next/link'

type BreadcrumbItem = { label: string; href?: string }

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 flex-wrap text-[15px] tracking-[0.3px]">
        <li>
          <Link href="/" className="text-gray-500 hover:text-navy-900 transition-colors">
            Home
          </Link>
        </li>
        {items.map((item) => (
          <Fragment key={item.label}>
            <li aria-hidden="true" className="text-gray-500">›</li>
            <li>
              {item.href ? (
                <Link href={item.href} className="text-gray-500 hover:text-navy-900 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-navy-900 font-semibold">
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}
