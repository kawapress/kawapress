import type { PageComponentEnv } from 'kawapress'
import type { MarkdownExit } from 'markdown-exit'
import type { ComponentDemoLabels } from './labels'
import type { ViteAlias } from './resolve'
import type { DemoTagAttributes } from './tag'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { addPageComponent } from 'kawapress'
import { COMPONENT_NAME } from './constants'
import { createDemoQueryId } from './query'
import { DemoFileError, resolveDemoFile } from './resolve'
import { DemoTagError, parseDemoTag } from './tag'

/** What the rewriter needs to know about the site, read when a tag is rendered. */
export interface DemoSiteContext {
  /** Absolute path of the site root. */
  root: string
  /** Markdown source folder, relative to `root`. */
  srcDir: string
  alias: ViteAlias
}

export interface InstallComponentDemoOptions {
  /** Tag name written in Markdown. */
  tag: string
  /** Whether the source starts expanded. */
  expandSource: boolean
  resolveLabels: (path: string) => ComponentDemoLabels
  getSite: () => DemoSiteContext
  /** Absolute path of the component that implements the demo block. */
  componentModule: string
}

interface DemoRenderEnv extends PageComponentEnv {
  sourcePath?: string
  /** Set while the LLMS plugin renders the page as plain Markdown. */
  ssgMarkdown?: boolean
}

/** Lines of frontmatter that were cut from each page before its tokens got line numbers. */
const frontmatterLines = new WeakMap<object, number>()
const STANDALONE_KEY = 'kawapressComponentDemoStandalone'

/**
 * Turns `<ComponentDemo src="./Demo.vue" />` blocks into the `KawaComponentDemo`
 * page component.
 *
 * The demo file is imported by the page itself, so it is rendered for real and
 * hot-updates in development. The source arrives through a second import of the
 * same file that Vite turns into highlighted HTML (see `vite-plugin.ts`), which
 * keeps the Markdown page from recompiling when only the demo changes.
 */
export function installComponentDemo(
  markdown: MarkdownExit,
  options: InstallComponentDemoOptions,
): void {
  const parse = markdown.parse.bind(markdown)
  markdown.parse = (src, env = {}) => {
    const tokens = parse(src, env)
    // The frontmatter plugin has set `env.content` by now.
    const body = (env as { content?: string }).content
    frontmatterLines.set(env, body === undefined ? 0 : Math.max(0, countLines(src) - countLines(body)))
    return tokens
  }

  // `@mdit-vue/plugin-component` turns a one-line unknown tag into a top-level
  // `html_inline` token without a line, and a multi-line one into an
  // `html_block`. Mark the top-level ones and give them the line of their text.
  markdown.core.ruler.push('kawapress:component-demo-lines', (state) => {
    for (const [index, token] of state.tokens.entries()) {
      if (token.type === 'html_inline') {
        token.meta = { ...token.meta as object, [STANDALONE_KEY]: true }
        token.map ??= state.tokens[index + 1]?.map ?? null
      }
      else if (token.type === 'inline') {
        for (const child of token.children ?? []) {
          child.map ??= token.map
        }
      }
    }
  })

  for (const type of ['html_block', 'html_inline'] as const) {
    const renderOriginal = markdown.renderer.rules[type]
    markdown.renderer.rules[type] = (tokens, index, renderOptions, env, renderer) => {
      const token = tokens[index]
      const context = env as DemoRenderEnv
      const line = (token.map?.[0] ?? 0) + 1 + (frontmatterLines.get(env) ?? 0)
      try {
        const attributes = parseDemoTag(token.content, options.tag)
        if (!attributes) {
          return renderOriginal
            ? renderOriginal(tokens, index, renderOptions, env, renderer)
            : token.content
        }
        const standalone = type === 'html_block'
          || (token.meta as Record<string, unknown> | null)?.[STANDALONE_KEY] === true
        if (!standalone) {
          throw new DemoTagError(
            `<${options.tag}> must stand alone in a block, separated from other text by blank lines.`,
          )
        }
        return renderDemo(markdown, options, context, attributes)
      }
      catch (error) {
        throw demoError(context, line, error)
      }
    }
  }
}

/**
 * Synchronous on purpose: the site compiler renders pages through a wrapped
 * `render()` that cannot wait for an async rule.
 */
function renderDemo(
  markdown: MarkdownExit,
  options: InstallComponentDemoOptions,
  env: DemoRenderEnv,
  attributes: DemoTagAttributes,
): string {
  if (attributes.component !== undefined) {
    throw new DemoTagError(
      'the component attribute (controls playground) is not available yet. Use src to show a static demo.',
    )
  }
  if (attributes.props !== undefined) {
    throw new DemoTagError('the props attribute only works together with the component attribute, which is not available yet.')
  }
  if (!attributes.src) {
    throw new DemoTagError(`<${options.tag}> needs a src attribute, for example src="./demos/Basic.vue".`)
  }

  const file = resolveFile(env, options, attributes.src)
  const title = attributes.title ? markdown.renderInline(attributes.title, env) : ''
  const description = attributes.description
    ? markdown.renderInline(attributes.description, env)
    : ''

  if (env.ssgMarkdown) {
    return renderPlainMarkdown(file, title, description)
  }

  const id = createHash('sha1').update(file).digest('hex').slice(0, 8)
  const demoName = `KawaDemo_${id}`
  const sourceName = `KawaDemoSource_${id}`
  const clientName = `KawaDemoClient_${id}`
  const demoTag = attributes.clientOnly ? clientName : demoName

  addPageComponent(env, { name: COMPONENT_NAME, from: options.componentModule })
  addPageComponent(env, attributes.clientOnly
    ? { name: clientName, from: createDemoQueryId(file, 'client') }
    : { name: demoName, from: file })
  // The default export is not a component, but the page binds it like one, so
  // the template can pass it to the demo block.
  addPageComponent(env, { name: sourceName, from: createDemoQueryId(file, 'source') })

  const props = [
    `:source="${sourceName}"`,
    `:expand-source="${options.expandSource}"`,
    `:client-only="${attributes.clientOnly}"`,
    `:labels='${escapeSingleQuoted(JSON.stringify(options.resolveLabels(env.path ?? '/')))}'`,
  ]
  return [
    `<${COMPONENT_NAME} ${props.join(' ')}>`,
    title && `<template #title>${title}</template>`,
    description && `<template #description>${description}</template>`,
    `<template #default><${demoTag} /></template>`,
    `</${COMPONENT_NAME}>`,
    '',
  ].filter(Boolean).join('\n')
}

/**
 * The page `.md` output of the LLMS plugin: title, description and the whole
 * source, no rendered demo.
 */
function renderPlainMarkdown(file: string, title: string, description: string): string {
  const source = readFileSync(file, 'utf8').replace(/\n$/, '')
  return [
    title && `<p><strong>${title}</strong></p>`,
    description && `<p>${description}</p>`,
    `<pre v-pre><code class="language-vue">${escapeHtml(source)}\n</code></pre>`,
    '',
  ].filter(Boolean).join('\n')
}

function resolveFile(env: DemoRenderEnv, options: InstallComponentDemoOptions, src: string): string {
  const { root, srcDir, alias } = options.getSite()
  const pageFile = env.sourcePath
    ? resolve(root, srcDir, env.sourcePath.replace(/^\//, ''))
    : undefined
  return resolveDemoFile(src, { pageFile, root, alias })
}

function demoError(env: DemoRenderEnv, line: number, error: unknown): Error {
  if (!(error instanceof DemoTagError || error instanceof DemoFileError)) {
    return error instanceof Error ? error : new Error(String(error))
  }
  const page = env.sourcePath ?? env.path ?? 'a page'
  return new Error(`KawaPress component demo, ${page} line ${line}: ${error.message}`, { cause: error })
}

function countLines(text: string): number {
  return (text.match(/\n/g) ?? []).length
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function escapeSingleQuoted(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('\'', '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
