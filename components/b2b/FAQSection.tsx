import { FAQSchema } from '@/components/schema/FAQSchema'
import { Accordion } from '@/components/ui/Accordion'

interface FAQ {
  question: string
  answer: string
}

interface Props {
  faq?: FAQ[]
}

export function FAQSection({ faq }: Props) {
  if (!faq || faq.length === 0) return null

  const items = faq.map(({ question, answer }) => ({ q: question, a: answer }))

  return (
    <section className="py-12 border-t border-gray-200">
      <h2 className="text-2xl font-bold text-navy-900 mb-8">Frequently Asked Questions</h2>
      <Accordion items={items} initialOpen={-1} />
      <FAQSchema faq={faq} />
    </section>
  )
}
