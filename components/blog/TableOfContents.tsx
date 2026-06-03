'use client'

import { useState } from 'react'
import type { TOCEntry } from '@/types/blog'

interface Props {
  entries: TOCEntry[]
}

export function TableOfContents({ entries }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      {/* Mobile toggle — hidden on lg+ */}
      <button
        type="button"
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-navy-900 lg:hidden"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        Contents
        <span className={`text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {/* Nav: controlled on mobile, always visible on desktop */}
      <nav
        aria-label="Table of contents"
        className={`px-4 pb-4 ${open ? 'block' : 'hidden'} lg:block lg:pt-4`}
      >
        <p className="hidden lg:block text-sm font-semibold text-navy-900 mb-3">Contents</p>
        <ol className="space-y-0.5">
          {entries.map((entry) => (
            <li key={entry.id} className={entry.level === 3 ? 'pl-4' : ''}>
              <a
                href={`#${entry.id}`}
                className="text-sm text-gray-500 hover:text-teal-500 transition-colors leading-relaxed block py-1"
              >
                {entry.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}
