interface Props {
  text: string
}

export function AnswerBlock({ text }: Props) {
  return (
    <p className="text-gray-500 text-[15px] leading-[1.75] mb-8 max-w-[500px]">
      {text}
    </p>
  )
}
