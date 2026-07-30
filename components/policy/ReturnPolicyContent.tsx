import type { ReturnPolicySection } from '@/lib/policy/return-policy'

// Shared renderer for the approved return-policy copy (DEV-POLICY-01).
// Used by /returns and the PDP Returns tab so the wording can never drift
// between surfaces. Pure presentational — safe in server and client trees.

export function ReturnPolicyContent({
  sections,
  headingLevel = 'h2',
}: {
  sections: ReturnPolicySection[]
  headingLevel?: 'h2' | 'h3'
}) {
  const Heading = headingLevel
  return (
    <div className="flex flex-col gap-4 max-w-[760px]">
      {sections.map((section, i) => (
        <div key={section.heading ?? i} className="flex flex-col gap-4">
          {section.heading && (
            <Heading className="text-navy-900 text-[18px] font-semibold tracking-[0.36px] mt-2">
              {section.heading}
            </Heading>
          )}
          {section.paragraphs.map((p) => (
            <p key={p.slice(0, 40)} className="text-gray-500 text-[15px] leading-[28px] tracking-[0.3px]">
              {p}
            </p>
          ))}
        </div>
      ))}
    </div>
  )
}
