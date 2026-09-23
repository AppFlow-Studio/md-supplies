// This group's root (app/(protected)/layout.tsx) already wraps <body> in an
// empty-fallback <Suspense>, which forces the WHOLE route to render
// per-request with no static shell attempt at all (see that file's doc
// comment). This layout's own <Suspense fallback={null}> — the previous
// mechanism, back when only the account subtree (not the shared root) opted
// out of prerendering — is redundant now and left the build's static-analysis
// pass confused about an already-fully-dynamic tree ("Uncached data was
// accessed outside of <Suspense>"), so it's gone.
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children
}
