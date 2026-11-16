import { canonicalRoutePath } from './route-path'

const MARKDOWN_PAGE_EXTENSION_RE = /\.(?:md|html)$/i

/** Convert a source-relative Markdown page path to its public route path. */
export function markdownPagePathToRoutePath(pagePath: string): string {
  const normalizedPath = `/${pagePath
    .replaceAll('\\', '/')
    .replace(/^\/+/, '')}`
  const withoutExtension = normalizedPath.replace(
    MARKDOWN_PAGE_EXTENSION_RE,
    '',
  )

  return canonicalRoutePath(withoutExtension.replace(/(?:^|\/)index$/, ''))
}
