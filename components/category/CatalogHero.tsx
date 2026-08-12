import { Breadcrumb } from '@/components/layout/Breadcrumb'
import { CategoryHeroImage } from '@/components/shared/CategoryHeroImage'
import type { ReactNode } from 'react'

/**
 * One hero for all 25 category and 5 industry detail pages.
 *
 * Three things it fixes versus the two heroes it replaces:
 *
 *  1. The image renders on MOBILE. The category hero's artwork lived in a
 *     `hidden lg:block` absolutely-positioned panel, so every phone visitor got
 *     a text-only hero; the industry hero had no image at all despite each
 *     industry card already having one uploaded.
 *  2. The description is shown IN FULL. The category hero clamped it to two
 *     lines (`line-clamp-2`), which truncated most of the approved copy —
 *     "Everyday exam-room equipment and supplies, including tables, stools,…"
 *     stopped mid-sentence. No clamp, no ellipsis, no hover reveal, no
 *     desktop-only duplicate.
 *  3. Ratios are consistent and reserved. 16:9 on phones, 16:5 from `lg` up,
 *     declared with aspect-ratio so the image box is sized before the bytes
 *     arrive — the artwork can no longer push the toolbar down as it loads.
 *
 * Cropping uses object-cover plus a per-route focal position, because a single
 * centre crop cuts the subject out of several of the supplied assets at 16:5.
 */

export type CatalogHeroProps = {
  breadcrumb: { label: string; href?: string }[]
  /** The approved public display name — also the page's single H1. */
  title: string
  /** The complete supplied description. Rendered in full. */
  description?: string
  /** Optional eyebrow above the H1. */
  eyebrow?: string
  image?: {
    path: string
    alt: string
    /**
     * CSS object-position for the crop, e.g. 'center 35%'. Registry-supplied
     * per route so a tall subject is not decapitated at 16:5.
     */
    focalPosition?: string
  }
  /** Industry CTAs and similar. Kept out of category heroes deliberately. */
  actions?: ReactNode
  /**
   * Answer-first SEO copy, rendered under the description. Distinct from
   * `description`: that is the short approved one-liner, this resolves the
   * page's question for a reader (and an answer engine) without pushing the
   * grid down the way a full copy block would.
   */
  answer?: string
  /**
   * Widens the artwork column. Industry heroes photograph the SETTING (a home
   * visit, an urgent-care bay), which needs room to read; category heroes are
   * product shots on white and do not.
   */
  imageEmphasis?: boolean
}

export function CatalogHero({
  breadcrumb,
  title,
  description,
  eyebrow,
  image,
  actions,
  answer,
  imageEmphasis = false,
}: CatalogHeroProps) {
  return (
    <div className="max-w-360 mx-auto px-4 sm:px-8 lg:px-14">
      <div className="py-4">
        <Breadcrumb items={breadcrumb} />
      </div>

      <div className="bg-white overflow-hidden lg:flex lg:items-stretch">
        {/* Artwork first in the DOM on mobile so it reads as a hero image, and
            side-by-side from lg. It collapses entirely when the CDN cannot
            serve it rather than reserving a blank panel. */}
        {image && (
          <div className={`lg:order-2 lg:shrink-0 ${imageEmphasis ? 'lg:w-[54%]' : 'lg:w-[45%]'}`}>
            <CategoryHeroImage
              bannerPath={image.path}
              alt={image.alt}
              className={`relative w-full aspect-[16/9] lg:aspect-auto lg:h-full ${imageEmphasis ? 'lg:min-h-[340px]' : 'lg:min-h-[240px]'}`}
              sizes={imageEmphasis ? '(min-width: 1024px) 54vw, 100vw' : '(min-width: 1024px) 45vw, 100vw'}
              objectPosition={image.focalPosition}
            />
          </div>
        )}

        <div className="lg:order-1 flex flex-1 flex-col justify-center px-5 sm:px-8 lg:px-10 py-6 sm:py-8">
          {eyebrow && (
            <div className="inline-flex self-start items-center bg-[rgba(0,193,255,0.2)] rounded-full px-3 py-1 mb-3">
              <span className="text-teal-500 text-[12px] font-semibold tracking-[0.3px]">
                {eyebrow}
              </span>
            </div>
          )}

          <h1 className="text-navy-900 text-[26px] sm:text-[34px] lg:text-[40px] font-semibold leading-[1.15] tracking-[-0.01em] mb-2">
            {title}
          </h1>

          {description && (
            <p className="text-gray-600 text-[15px] sm:text-[16px] leading-[1.6] max-w-[62ch]">
              {description}
            </p>
          )}

          {answer && (
            <p className="text-gray-600 text-[15px] leading-[1.7] max-w-[62ch] mt-3">
              {answer}
            </p>
          )}

          {actions && <div className="flex flex-wrap gap-3 mt-4">{actions}</div>}
        </div>
      </div>
    </div>
  )
}
