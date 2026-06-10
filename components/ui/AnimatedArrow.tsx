interface Props {
  className?: string;
}

export function AnimatedArrow({ className }: Props) {
  return (
    <span
      className={`inline-block transition-transform duration-200 group-hover:translate-x-1 ${className ?? ""}`}
      aria-hidden
    >
      →
    </span>
  );
}
