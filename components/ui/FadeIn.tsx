'use client'

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

// Lightweight scroll-reveal: a CSS transition driven by one shared
// IntersectionObserver (styles in globals.css under `.fade-in`). Replaces the
// framer-motion whileInView/variants pattern that shipped the whole motion
// runtime in the shared client bundle for reveals CSS can do (audit M24).
// `prefers-reduced-motion` is honored in the CSS, matching the old
// <MotionConfig reducedMotion="user">.

let observer: IntersectionObserver | null = null

function observeOnce(el: Element) {
  if (typeof IntersectionObserver === 'undefined') {
    el.classList.add('is-visible')
    return () => {}
  }
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer!.unobserve(entry.target)
        }
      }
    },
    // Mirror framer's default viewport behavior: trigger as soon as any part
    // of the element enters the viewport, once.
    { rootMargin: '0px 0px -10% 0px' },
  )
  observer.observe(el)
  return () => observer?.unobserve(el)
}

type FadeInTag = 'div' | 'span' | 'section' | 'ul' | 'li' | 'p' | 'h1' | 'h2' | 'h3'

interface FadeInProps {
  children: ReactNode
  /** Transition delay in seconds (stagger grids with `i * 0.08`). */
  delay?: number
  className?: string
  /** Slide-in direction; 'up' matches the old framer y:24 default. */
  from?: 'up' | 'left' | 'right' | 'none'
  /** Rendered element, for reveals on semantic tags. */
  as?: FadeInTag
}

const FROM_TRANSFORM: Record<NonNullable<FadeInProps['from']>, string | undefined> = {
  up: undefined, // translateY(24px) — the CSS default
  left: 'translateX(-32px)',
  right: 'translateX(32px)',
  none: 'translateY(0)',
}

export function FadeIn({ children, delay = 0, className, from = 'up', as = 'div' }: FadeInProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    return observeOnce(el)
  }, [])

  const style: CSSProperties = {}
  if (delay) style.transitionDelay = `${delay}s`
  const transform = FROM_TRANSFORM[from]
  if (transform) (style as Record<string, string>)['--fade-from'] = transform

  const Tag = as
  return (
    <Tag
      ref={ref as never}
      className={className ? `fade-in ${className}` : 'fade-in'}
      style={Object.keys(style).length ? style : undefined}
    >
      {children}
    </Tag>
  )
}
