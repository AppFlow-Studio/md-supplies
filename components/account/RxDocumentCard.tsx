'use client'

import { useState, useTransition, useRef } from 'react'
import { FileCheck2, FileClock, FileUp, ShieldCheck } from 'lucide-react'
import { uploadRxDocument } from '@/app/actions/rx'

// Account-level RX prescription document card (P0 RX-gate ticket).
// States: none → uploaded-unverified → verified. Once a document is on
// file the account is never prompted at checkout again; "verified" is
// flipped by the merchant in Admin (enforcement-app signal).

type Props = {
  hasDocument: boolean
  verified: boolean
}

export function RxDocumentCard({ hasDocument: initialHasDocument, verified }: Props) {
  const [hasDocument, setHasDocument] = useState(initialHasDocument)
  const [error, setError] = useState<string | null>(null)
  const [justUploaded, setJustUploaded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await uploadRxDocument(formData)
      if (result.ok) {
        setHasDocument(true)
        setJustUploaded(true)
        formRef.current?.reset()
      } else {
        setError(result.error)
      }
    })
  }

  const state: 'verified' | 'uploaded' | 'none' = verified && !justUploaded
    ? 'verified'
    : hasDocument
      ? 'uploaded'
      : 'none'

  return (
    <div className="bg-white">
      <div className="flex items-center justify-between px-8 pt-8 pb-5 border-b border-gray-200">
        <h2 className="text-navy-900 text-[20px] font-semibold">Prescription Document</h2>
        {state === 'verified' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(0,193,255,0.15)] text-teal-500 text-[12px] font-semibold tracking-[0.3px] uppercase">
            <ShieldCheck size={13} />
            Verified
          </span>
        )}
        {state === 'uploaded' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-[12px] font-semibold tracking-[0.3px] uppercase">
            <FileClock size={13} />
            Pending Review
          </span>
        )}
      </div>

      <div className="px-8 py-6 flex flex-col gap-4">
        {state === 'verified' && (
          <div className="flex items-start gap-4">
            <div className="w-[44px] h-[44px] rounded-[10px] bg-[rgba(0,193,255,0.12)] flex items-center justify-center shrink-0">
              <FileCheck2 size={20} className="text-teal-500" />
            </div>
            <p className="text-gray-500 text-[14px] leading-relaxed">
              Your prescription document is on file and verified. Prescription-required
              items will check out without any additional steps.
            </p>
          </div>
        )}

        {state === 'uploaded' && (
          <div className="flex items-start gap-4">
            <div className="w-[44px] h-[44px] rounded-[10px] bg-amber-50 flex items-center justify-center shrink-0">
              <FileClock size={20} className="text-amber-600" />
            </div>
            <p className="text-gray-500 text-[14px] leading-relaxed">
              Your document has been received and is awaiting review. You can check out
              with prescription-required items — no need to upload again.
            </p>
          </div>
        )}

        {state === 'none' && (
          <p className="text-gray-500 text-[14px] leading-relaxed">
            Some items (e.g. certain needles and syringes) require a prescription or
            medical license on file. Upload it once — it stays on your account and
            you won&apos;t be asked again.
          </p>
        )}

        {state !== 'verified' && (
          <form ref={formRef} action={handleSubmit} className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <input
              type="file"
              name="rx-document"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              required
              className="text-[14px] text-gray-500 file:mr-4 file:border file:border-gray-300 file:bg-white file:text-navy-900 file:text-[13px] file:font-semibold file:px-4 file:h-[40px] file:cursor-pointer hover:file:border-navy-900 file:transition-colors"
            />
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 bg-navy-900 text-white text-[14px] font-semibold px-6 h-[44px] hover:bg-navy-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
            >
              <FileUp size={16} />
              {isPending ? 'Uploading…' : state === 'uploaded' ? 'Replace Document' : 'Upload Document'}
            </button>
          </form>
        )}

        {error && <p className="text-red-600 text-[13px]">{error}</p>}
        {state !== 'verified' && (
          <p className="text-gray-400 text-[12px]">PDF, JPG, PNG, or WebP — max 10 MB.</p>
        )}
      </div>
    </div>
  )
}
