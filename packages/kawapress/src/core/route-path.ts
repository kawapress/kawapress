/**
 * The canonical form of a route path: no trailing slash, except for the site
 * root. `/guide/` and `/guide` address the same page, the one whose route is
 * `/guide`, so every lookup in the page table goes through this form.
 */
export function canonicalRoutePath(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  return trimmed || '/'
}
