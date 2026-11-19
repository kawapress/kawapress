import type { MarkdownItContainerOptions } from '@mdit/plugin-container'
import type { MarkdownExit, RenderRule } from 'markdown-exit'
import type { VueReplLabels } from './labels'
import type { ReplFile, ReplImportMap } from './playground'
import { container } from '@mdit/plugin-container'
import { useMarkdownItPlugin } from 'kawapress'
import { createPlaygroundUrl } from './playground'

export type VueReplEditor = 'codemirror' | 'monaco'

/** Settings that every block of the site shares. They travel to the component as one prop. */
export interface VueReplConfig {
  editor: VueReplEditor
  eager: boolean
  importMap?: ReplImportMap
  previewStyles?: string[]
}

export interface ReplFenceInfo {
  /** Language word of the fence, which Shiki still needs to highlight it. */
  lang: string
  /** File extension in the REPL. */
  ext: string
  /** Name from a trailing `[name]` label. */
  name?: string
  /** Height from `{height=480}`, in pixels. */
  height?: number
}

/** Height of the REPL in pixels when neither the fence nor the container sets one. */
export const DEFAULT_REPL_HEIGHT = 480

const OPEN_TOKEN = 'container_repl_open'
const CLOSE_TOKEN = 'container_repl_close'
const META_KEY = 'kawapressVueRepl'
const CONTAINER_RE = /^repl(?=\s|\{|$)/
const HEIGHT_RE = /\{\s*height\s*=\s*(\d+)\s*\}/
const EXTENSIONS: Record<string, string> = {
  vue: 'vue',
  ts: 'ts',
  typescript: 'ts',
  js: 'js',
  javascript: 'js',
  css: 'css',
  json: 'json',
}

type RenderRuleArgs = Parameters<RenderRule>

interface ReplRenderEnv {
  /** Route of the page being compiled. */
  path?: string
}

interface ReplMeta {
  /** On a container's open token: the files it collected. */
  files?: ReplFile[]
  main?: string
  height?: number
  /** On a fence inside a container: the index of its file. */
  file?: number
}

export interface InstallVueReplOptions {
  config: VueReplConfig
  /** Labels of the page being rendered, resolved once per block. */
  resolveLabels: (path: string) => VueReplLabels
  /** Called with the page environment for every block, to import the page component. */
  onRepl?: (env: RenderRuleArgs[3]) => void
}

/**
 * Reads the fence info of a REPL fence: a language word, the word `repl`, and
 * optionally `[Name.vue]` and `{height=480}`. Everything else is ignored so
 * other plugins can keep their own meta on the same fence.
 */
export function parseReplInfo(info: string): ReplFenceInfo | undefined {
  const words = stripMeta(info)
  const [lang, ...rest] = words
  if (!lang || !rest.includes('repl')) {
    return undefined
  }
  const ext = EXTENSIONS[lang.toLowerCase()]
  return ext === undefined ? undefined : { ...readFenceMeta(info), lang, ext }
}

/**
 * Turns ```` ```vue repl ```` fences and `::: repl` containers into a
 * `KawaVueRepl` page component.
 *
 * The server renders the highlighted source with a Run button and a link to
 * play.vuejs.org, so the page needs no script to look right. `@vue/repl` only
 * loads in the browser when the reader asks for it.
 */
export function installVueRepl(
  markdown: MarkdownExit,
  options: InstallVueReplOptions,
): void {
  useMarkdownItPlugin(markdown, container, {
    name: 'repl',
    validate: params => CONTAINER_RE.test(params.trim()),
    openRender(tokens, index, _options, env) {
      const meta = getMeta(tokens[index])
      options.onRepl?.(env)
      return renderOpen(options, env, meta.files ?? [], meta.main ?? '', meta.height)
    },
    closeRender: () => '</KawaVueRepl>\n',
  } satisfies MarkdownItContainerOptions)

  markdown.core.ruler.after('block', 'kawapress:vue-repl', (state) => {
    let open: { index: number, files: ReplFile[], taken: Set<string> } | undefined

    for (const [index, token] of state.tokens.entries()) {
      if (token.type === OPEN_TOKEN) {
        open = { index, files: [], taken: new Set() }
        continue
      }
      if (token.type === CLOSE_TOKEN) {
        if (open) {
          finishContainer(state.tokens[open.index], open.files)
          open = undefined
        }
        continue
      }
      if (!open) {
        continue
      }
      if (token.type !== 'fence') {
        throw new Error(
          `KawaPress repl only accepts fenced code blocks, found ${JSON.stringify(token.type)}.`,
        )
      }

      const file = readContainerFile(token.info, token.content, open.files.length)
      if (open.taken.has(file.name)) {
        throw new Error(`KawaPress repl has two files named ${JSON.stringify(file.name)}.`)
      }
      open.taken.add(file.name)
      getMeta(token).file = open.files.length
      open.files.push(file)
    }
  })

  const renderFence = markdown.renderer.rules.fence
  markdown.renderer.rules.fence = (tokens, index, renderOptions, env, renderer) => {
    const token = tokens[index]
    const renderOriginal = (): string | Promise<string> => renderFence
      ? renderFence(tokens, index, renderOptions, env, renderer)
      : renderer.renderToken(tokens, index, renderOptions)

    const inContainerAt = getMeta(token).file
    const standalone = inContainerAt === undefined ? parseReplInfo(token.info) : undefined
    if (inContainerAt === undefined && standalone?.ext !== 'vue') {
      return renderOriginal()
    }

    // Shiki gets the language only: `repl`, `[name]` and `{height=…}` are ours.
    const originalInfo = token.info
    token.info = stripMeta(originalInfo)[0] ?? ''
    let code: string | Promise<string>
    try {
      code = renderOriginal()
    }
    catch (error) {
      token.info = originalInfo
      throw error
    }

    const wrap = (codeHtml: string): string => {
      token.info = originalInfo
      if (inContainerAt !== undefined) {
        return `<template #file-${inContainerAt}>\n${codeHtml}</template>\n`
      }
      options.onRepl?.(env)
      const file: ReplFile = {
        name: withExtension(standalone!.name, standalone!.ext, 'App'),
        code: token.content,
      }
      return `${renderOpen(options, env, [file], file.name, standalone!.height)}<template #file-0>\n${codeHtml}</template>\n</KawaVueRepl>\n`
    }
    return typeof code === 'string' ? wrap(code) : code.then(wrap)
  }
}

function finishContainer(
  open: { info: string, meta: unknown },
  files: ReplFile[],
): void {
  const main = files.find(file => file.name.endsWith('.vue'))
  if (!main) {
    throw new Error('KawaPress repl needs at least one .vue file, which is the entry.')
  }
  const meta = getMeta(open)
  meta.files = files
  meta.main = main.name
  meta.height = readFenceMeta(open.info).height
}

function renderOpen(
  options: InstallVueReplOptions,
  env: RenderRuleArgs[3],
  files: ReplFile[],
  main: string,
  height: number | undefined,
): string {
  const { path } = (env ?? {}) as ReplRenderEnv
  const props = [
    `:files='${escapeSingleQuotedAttribute(JSON.stringify(files))}'`,
    `main="${escapeDoubleQuotedAttribute(main)}"`,
    `:height="${height ?? DEFAULT_REPL_HEIGHT}"`,
    `playground="${escapeDoubleQuotedAttribute(createPlaygroundUrl(files, main, options.config.importMap))}"`,
    `:config='${escapeSingleQuotedAttribute(JSON.stringify(options.config))}'`,
    `:labels='${escapeSingleQuotedAttribute(JSON.stringify(options.resolveLabels(path ?? '/')))}'`,
  ]
  return `<KawaVueRepl ${props.join(' ')}>\n`
}

/** File of a fence inside `::: repl`. The `repl` word is optional there. */
function readContainerFile(info: string, code: string, position: number): ReplFile {
  const [lang] = stripMeta(info)
  const ext = lang === undefined ? undefined : EXTENSIONS[lang.toLowerCase()]
  if (ext === undefined) {
    throw new Error(
      `KawaPress repl cannot use a ${JSON.stringify(lang ?? '')} code block. Use vue, ts, js, css or json.`,
    )
  }
  const { name } = readFenceMeta(info)
  // The first .vue file without a name is the entry, so a bare ```vue works.
  return { name: withExtension(name, ext, position === 0 ? 'App' : `file-${position + 1}`), code }
}

function withExtension(name: string | undefined, ext: string, fallback: string): string {
  const base = name || fallback
  return /\.\w+$/.test(base) ? base : `${base}.${ext}`
}

function readFenceMeta(info: string): { name?: string, height?: number } {
  const name = info.match(/\[([^\]]+)\]/)?.[1]?.trim()
  const height = info.match(HEIGHT_RE)?.[1]
  return {
    name: name || undefined,
    height: height === undefined ? undefined : Number(height),
  }
}

function stripMeta(info: string): string[] {
  return info
    .replace(/\[[^\]]*\]|\{[^}]*\}/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

function getMeta(token: { meta: unknown }): ReplMeta {
  const metadata = token.meta && typeof token.meta === 'object'
    ? token.meta as Record<string, unknown>
    : {}
  token.meta = metadata
  metadata[META_KEY] ??= {}
  return metadata[META_KEY] as ReplMeta
}

function escapeSingleQuotedAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('\'', '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeDoubleQuotedAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
