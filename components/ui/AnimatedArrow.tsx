import { ArrowRight } from 'lucide-react'

export function AnimatedArrow({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <ArrowRight size={size} aria-hidden
      className={`inline-block shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-1 ${className}`} />
  )
}
