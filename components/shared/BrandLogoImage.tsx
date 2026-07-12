'use client'

import { useState } from 'react'

interface Props {
  /** Logo URL, or undefined when there is no logo at all. */
  src?: string
  /** Brand name — used for alt text and the text fallback. */
  name: string
  /** Intrinsic dimensions of the logo file — reserve the aspect ratio before load (no CLS). */
  width?: number
  height?: number
  /** Classes applied to the <img>. */
  className?: string
  /** Classes applied to the text fallback span. */
  fallbackClassName?: string
}

/**
 * Renders a brand logo, falling back to a clean text label when the logo is
 * missing or fails to load. Guarantees no broken-image placeholders ever
 * appear (closeout §6 / §13.1).
 */
export function BrandLogoImage({ src, name, width, height, className, fallbackClassName }: Props) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <span
        className={
          fallbackClassName ??
          'font-bold text-[15px] tracking-[0.04em] text-navy-900 select-none'
        }
      >
        {name}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${name} logo`}
      width={width}
      height={height}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
