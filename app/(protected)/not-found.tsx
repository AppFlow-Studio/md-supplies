import { NotFoundPage } from '@/components/error/NotFoundPage'

// This group's own root (app/(protected)/layout.tsx) has no ancestor in
// common with app/(site)/not-found.tsx, so notFound() calls under /account
// or /search (e.g. an unknown order number) need their own copy of this file.
export default function NotFound() {
  return <NotFoundPage />
}
