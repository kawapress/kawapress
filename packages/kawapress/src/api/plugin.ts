import type { MarkdownExit } from 'markdown-exit'
import type { UserConfig } from 'vite'
import type { App } from 'vue'
import type { PageData } from '../core/extension-points'
import type { OutletItemInput, OutletName } from '../core/outlet'
import type { Router } from '../core/router'
import type { ResolvedSiteConfig, SiteConfig } from '../core/site'
import type { MaybePromise, RegisterPluginPages } from './plugin-pages'

export type { MaybePromise } from './plugin-pages'

export type GeneratorPluginHandler<T> = (value: T) => MaybePromise<void>

export interface PageBuildArtifact {
  /** Markdown source of the page, with `<!--@include-->` and `<<<` written out. */
  source: string
  /** `file` for a Markdown file in srcDir, `plugin` for a page added by `pages()`. */
  origin: PageOrigin
  /** Absolute path of the Markdown file. Missing for a plugin page. */
  file?: string
  /**
   * Path of the file relative to srcDir, for example `/packages/a/src/intro.md`.
   * A plugin page uses the `sourcePath` the core generates, `<plugin name><page
   * path>`, for example `@typedoc/core/define-plugin.md`.
   */
  sourcePath: string
  /**
   * Source path after `rewrites`, for example `/a/intro.md`. Relative links of
   * the page start here; it equals `sourcePath` when no rule moves the page.
   */
  pagePath: string
  routePath: string
  pageData: Readonly<PageData>
}

export interface BuildArtifactsContext {
  pages: readonly PageBuildArtifact[]
  emitFile: (
    path: string,
    content: string | Uint8Array,
  ) => Promise<void>
  importModule: <T = unknown>(path: string) => Promise<T>
}

/** Where a page comes from: a Markdown file in srcDir, or a plugin's `pages()`. */
export type PageOrigin = 'file' | 'plugin'

/** Where the page being processed comes from. Generator-only; never sent to the browser. */
export interface PageDataContext {
  origin: PageOrigin
  /** Absolute path of the Markdown source file. Missing for a plugin page. */
  file?: string
  /**
   * Source path relative to srcDir, for example `/guide/intro.md`. A plugin
   * page has the `<plugin name><page path>` the core generates.
   */
  sourcePath: string
}

export type PageDataHandler = (
  pageData: PageData,
  context: Readonly<PageDataContext>,
) => MaybePromise<void>

export interface GeneratorPluginAPI {
  /** Changes the site config. Values are raw here: defaults are not applied yet. */
  config: (handler: GeneratorPluginHandler<SiteConfig>) => void
  /**
   * Reads the final site config once every `config()` hook ran, with defaults
   * applied and values normalized. Runs before `markdown()` and `vite()`.
   */
  configResolved: (handler: GeneratorPluginHandler<ResolvedSiteConfig>) => void
  markdown: (handler: GeneratorPluginHandler<MarkdownExit>) => void
  /**
   * Adds a group of pages that do not come from a Markdown file: the route
   * template first, then where the content comes from, a file template or a
   * generator function. Groups are collected after every `configResolved()`,
   * when the page list is first needed. A plugin can call it more than once;
   * each call is its own group.
   */
  pages: RegisterPluginPages
  pageData: (handler: PageDataHandler) => void
  pageArtifact: (
    handler: GeneratorPluginHandler<Readonly<PageBuildArtifact>>,
  ) => void
  vite: (handler: GeneratorPluginHandler<UserConfig>) => void
  buildArtifacts: (
    handler: GeneratorPluginHandler<BuildArtifactsContext>,
  ) => void
}

export type GeneratorPluginSetup
  = (api: GeneratorPluginAPI) => MaybePromise<void>

export interface KawaPressPlugin {
  name: string
  setup: GeneratorPluginSetup
}

export function definePlugin(plugin: KawaPressPlugin): KawaPressPlugin {
  return plugin
}

export type RuntimePluginHandler<T> = (value: T) => MaybePromise<void>

export interface RuntimePluginAPI {
  /** Places a component before the theme's own content of an outlet. */
  prependToOutlet: (outlet: OutletName, item: OutletItemInput) => void
  /** Places a component after the theme's own content of an outlet. */
  appendToOutlet: (outlet: OutletName, item: OutletItemInput) => void
  vueApp: (handler: RuntimePluginHandler<App>) => void
  router: (handler: RuntimePluginHandler<Router>) => void
}

export type RuntimePluginSetup
  = (api: RuntimePluginAPI) => MaybePromise<void>

export interface RuntimePlugin {
  name: string
  setup: RuntimePluginSetup
}

export function defineRuntimePlugin(plugin: RuntimePlugin): RuntimePlugin {
  return plugin
}
