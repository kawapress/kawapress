import { posix } from 'node:path'
import { normalizePath } from 'vite'

/** Elements and attributes whose URL Vue's template compiler turns into an asset import. */
const ASSET_ELEMENTS = /<(?:img|video|source|image|use)\b[^>]*>/g
const ASSET_ATTRIBUTES = /(\s(?:src|poster|xlink:href|href)=")(\.{1,2}\/[^"]*)"/g

/**
 * Points the relative asset URLs of rendered Markdown at the directory of the
 * file the Markdown came from, as `/@fs/` URLs. A page made from a file has no
 * file at its own module id, so the template compiler could not resolve
 * `./logo.png` against that id. Dev serves `/@fs/` URLs as they are and the
 * build imports them as assets.
 */
export function rewriteRelativeAssetUrls(html: string, directory: string): string {
  const base = normalizePath(directory)
  return html.replaceAll(ASSET_ELEMENTS, tag => tag.replaceAll(
    ASSET_ATTRIBUTES,
    (_match, attribute: string, url: string) => `${attribute}${toFsUrl(base, url)}"`,
  ))
}

function toFsUrl(directory: string, url: string): string {
  const suffixStart = url.search(/[?#]/)
  const path = suffixStart === -1 ? url : url.slice(0, suffixStart)
  const suffix = suffixStart === -1 ? '' : url.slice(suffixStart)
  return `/@fs/${posix.join(directory, path).replace(/^\//, '')}${suffix}`
}
