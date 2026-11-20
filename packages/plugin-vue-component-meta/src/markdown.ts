import type { MarkdownExit, RenderRule } from 'markdown-exit'
import type { ApiSection } from './api-table'
import type { ComponentApiLabels } from './labels'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { API_SECTIONS } from './api-table'

type RenderRuleArgs = Parameters<RenderRule>

interface ComponentApiRenderEnv {
  /** Route of the page being compiled. */
  path?: string
  /** Source path of the page relative to the source folder, for example `guide/button.md`. */
  sourcePath?: string
}

export interface InstallComponentApiOptions {
  /** Tag name in Markdown. */
  tag: string
  /** Absolute folder that holds the Markdown sources. */
  sourceRoot: () => string
  /** Labels of the page being rendered. */
  resolveLabels: (path: string) => ComponentApiLabels
  /** Declares the page component that the rewritten tag uses. */
  onApi: (env: RenderRuleArgs[3], component: { name: string, from: string }) => void
}

const ATTRIBUTE_RE = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
const QUERY = '?component-api'

/**
 * Rewrites `<ComponentApi src="./Button.vue" only="props" />` into a page
 * component that carries the component's data.
 *
 * The data lives in a Vite module (`<src>?component-api`), not in the page:
 * Vite then handles aliases and hot updates, and the checker only runs for
 * pages that use the tag.
 */
export function installComponentApi(
  markdown: MarkdownExit,
  options: InstallComponentApiOptions,
): void {
  const tagRe = new RegExp(`<${escapeRegExp(options.tag)}(\\s[^>]*?)?\\s*/?>(?:\\s*</${escapeRegExp(options.tag)}>)?`, 'g')

  for (const rule of ['html_block', 'html_inline'] as const) {
    const original = markdown.renderer.rules[rule]
    markdown.renderer.rules[rule] = (tokens, index, renderOptions, env, renderer) => {
      const token = tokens[index]
      if (token.content.includes(`<${options.tag}`)) {
        token.content = token.content.replace(tagRe, (_match, attributes: string | undefined) => (
          rewriteTag(parseAttributes(attributes ?? ''), env, options)
        ))
      }
      return original
        ? original(tokens, index, renderOptions, env, renderer)
        : token.content
    }
  }
}

function rewriteTag(
  attributes: Record<string, string>,
  env: RenderRuleArgs[3],
  options: InstallComponentApiOptions,
): string {
  const { path = '/', sourcePath } = (env ?? {}) as ComponentApiRenderEnv
  const page = sourcePath ?? path

  const src = attributes.src?.trim()
  if (!src) {
    throw new Error(`KawaPress Vue Component Meta: <${options.tag}> on ${page} needs a src, for example <${options.tag} src="../src/Button.vue" />.`)
  }
  const only = attributes.only?.trim()
  if (only && !API_SECTIONS.includes(only as ApiSection)) {
    throw new Error(`KawaPress Vue Component Meta: <${options.tag} only="${only}"> on ${page} must be one of ${API_SECTIONS.join(', ')}.`)
  }

  const specifier = src.startsWith('.')
    ? resolve(dirname(join(options.sourceRoot(), sourcePath ?? '')), src)
    : src
  const from = `${specifier}${QUERY}${only ? `&only=${only}` : ''}`
  // One import per distinct (component, section) pair on the page.
  const name = `KawaComponentApi_${createHash('sha1').update(from).digest('hex').slice(0, 8)}`
  options.onApi(env, { name, from })

  return `<${name} :labels='${escapeSingleQuotedAttribute(JSON.stringify(options.resolveLabels(path)))}' />`
}

function parseAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {}
  for (const match of source.matchAll(ATTRIBUTE_RE)) {
    attributes[match[1]] = match[2] ?? match[3] ?? ''
  }
  return attributes
}

function escapeSingleQuotedAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('\'', '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
