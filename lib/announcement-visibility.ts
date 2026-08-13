/**
 * Where the top announcement carousel is allowed to appear.
 *
 * Rule (spec §14): visible on the mobile HOMEPAGE only; hidden at phone widths
 * on every other route; desktop behaviour unchanged everywhere.
 *
 * Kept as a pure function rather than inline JSX logic so the route matching is
 * testable on its own — the edge cases (trailing slash, query string, nested
 * paths that merely start with "/") are exactly the ones a hand-written check
 * in a component gets wrong.
 */

/**
 * True only for the site root. Everything else — including `/categories`,
 * `/category/gloves`, `/contact`, `/solutions/occ` and any nested route — is an
 * inner page.
 *
 * `pathname` comes from usePathname(), which is already normalised: no query
 * string, no hash. The trailing-slash case is handled anyway because a
 * misconfigured proxy or a future trailingSlash:true would otherwise silently
 * turn every route into "not home".
 */
export function isHomeRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  // Strip the query/hash defensively in case a caller passes a raw URL, then
  // collapse a trailing slash. '/' itself must survive that collapse.
  const path = pathname.split(/[?#]/)[0]
  const normalized = path.length > 1 ? path.replace(/\/+$/, '') : path
  return normalized === '' || normalized === '/'
}

/**
 * Tailwind classes for the announcement bar's outer element.
 *
 * The bar stays in the DOM on inner routes because the SAME HTML serves phones
 * and desktops, and desktop must keep it on every route — so visibility is a
 * breakpoint decision, not a render decision. `hidden md:flex` removes it from
 * layout flow entirely at phone widths (no empty spacer, no reserved height, no
 * header-offset drift), and because it is a static class rather than
 * client-measured state there is no hydration flash.
 */
export function announcementBarClass(pathname: string | null | undefined): string {
  return isHomeRoute(pathname) ? 'flex' : 'hidden md:flex'
}
