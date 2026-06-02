import { FAQSchema } from '@/components/schema/FAQSchema'

interface FAQ {
  question: string
  answer: string
}

interface Props {
  faq?: FAQ[]
}

export function FAQSection({ faq }: Props) {
  if (!faq || faq.length === 0) return null

  return (
    <section className="py-12 border-t border-gray-200">
      <h2 className="text-2xl font-bold text-navy-900 mb-8">Frequently Asked Questions</h2>
      <dl className="space-y-4">
        {faq.map(({ question, answer }) => (
          <div key={question} className="border border-gray-200 rounded-xl p-6 bg-white">
            <dt className="text-base font-semibold text-navy-900 mb-2">{question}</dt>
            <dd className="text-sm text-gray-500 leading-relaxed">{answer}</dd>
          </div>
        ))}
      </dl>
      <FAQSchema faq={faq} />
    </section>
  )
}
