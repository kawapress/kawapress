import { decodeUrlPathname } from './base'
import { NOT_FOUND_ROUTE_PATH } from './not-found'
import { canonicalRoutePath } from './route-path'

/**
 * Static hosts ignore the query and no browser ever sends the hash, so the HTML
 * a visitor receives can only describe the path: `/guide/routing?from=search#links`
 * is answered with the document of `/guide/routing`. The client therefore has to
 * render that same path first and move to the full URL only afterwards;
 * otherwise everything that reads the current route (language links, for
 * example) renders other values than the served markup and Vue reports a
 * hydration mismatch.
 */

export interface HydrationPlanInput {
  /** Whether the served HTML carries the not-found document marker. */
  isNotFoundDocument: boolean
  /** Location the visitor opened, site base already removed, still percent-encoded. */
  requestedLocation: string
  /** Whether the page table has a page for a route path. */
  hasPage: (path: string) => boolean
}

export interface HydrationPlan {
  /** Route the client renders first, so its first render matches the served HTML. */
  startPath: string
  /** Location adopted after mount without a navigation and without a history entry. */
  adoptPath?: string
  /** Location the address bar should show after mount, for example a decoded path or one without its trailing slash. */
  replacePath?: string
}

/**
 * Pick the route for the first client render.
 *
 * The prerendered not-found document was rendered once, at `/404`, and is served
 * for every unknown URL, so its first render has to resolve `/404` too. Every
 * other document was rendered for its path alone, so the query and the hash are
 * dropped for the first render and adopted right afterwards, which is a normal
 * update instead of a mismatch. A percent-encoded path was rendered decoded and
 * `/guide/` was rendered as the page `/guide`, so the first render uses that
 * page path and the address bar follows it.
 */
export function resolveHydrationPlan(
  { isNotFoundDocument, requestedLocation, hasPage }: HydrationPlanInput,
): HydrationPlan {
  const path = pathOf(requestedLocation)
  const suffix = requestedLocation.slice(path.length)
  const decodedPath = decodeUrlPathname(path)
  const decodedLocation = `${decodedPath}${suffix}`
  const wasEncoded = decodedPath !== path
  // A bare `?` or `#` addresses the same path with nothing to adopt.
  const hasSuffix = /[^?#]/.test(suffix)
  const startPath = decodedPath || '/'
  const pagePath = canonicalRoutePath(startPath)

  if (isNotFoundDocument) {
    return {
      startPath: NOT_FOUND_ROUTE_PATH,
      adoptPath: decodedLocation,
      ...wasEncoded ? { replacePath: decodedLocation } : {},
    }
  }

  if ((wasEncoded || pagePath !== startPath) && hasPage(pagePath)) {
    const pageLocation = `${pagePath}${suffix}`
    return {
      startPath: pagePath,
      ...hasSuffix ? { adoptPath: pageLocation } : {},
      replacePath: pageLocation,
    }
  }

  return hasSuffix
    ? { startPath, adoptPath: `${startPath}${suffix}` }
    : { startPath }
}

/** Path part of a location: everything before the query or the hash. */
function pathOf(location: string): string {
  const suffixIndex = location.search(/[?#]/)
  return suffixIndex === -1 ? location : location.slice(0, suffixIndex)
}
