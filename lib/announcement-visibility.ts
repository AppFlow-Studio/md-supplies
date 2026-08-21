/**
 * Where the top announcement carousel is allowed to appear.
 *
 * Rule: hidden at phone widths on EVERY route, including the homepage; desktop
 * behaviour unchanged everywhere.
 *
 * This used to keep the bar on the mobile homepage (spec §14). Phone viewports
 * have no vertical budget for it: the bar cost 54px of a ~72px header stack
 * before the shopper saw a single product, and it pushed the search field and
 * the first row of content below the fold on a 360–430px screen. Desktop keeps
 * it because there the same 54px is free real estate.
 *
 * `isHomeRoute` is retained (and still tested) because the route-normalisation
 * edge cases it encodes — trailing slash, query string, nested paths that
 * merely start with "/" — are the ones any future route-gated header element
 * would otherwise get wrong.
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
 * The bar stays in the DOM because the SAME HTML serves phones and desktops,
 * and desktop must keep it on every route — so visibility is a breakpoint
 * decision, not a render decision. `hidden md:flex` removes it from layout flow
 * entirely below 768px (no empty spacer, no reserved height, no header-offset
 * drift, no CLS), and because it is a static class rather than client-measured
 * state there is no hydration flash and no route-dependent branch.
 *
 * Takes no argument on purpose: the rule is now route-independent, and a
 * parameter that no longer changes the result is a trap for the next reader.
 */
export function announcementBarClass(): string {
  return 'hidden md:flex'
}
