import type { PageData, ThemeConfig } from './extension-points'
import type { HeadConfig } from './head'
import { assertJsonSerializable } from './json'

export type LocaleDirection = 'ltr' | 'rtl'

export interface LocaleConfig {
  label: string
  lang?: string
  dir?: LocaleDirection
  link?: string
  title?: string
  /** Description of pages in this locale that set none in frontmatter. */
  description?: string
  head?: HeadConfig[]
  themeConfig?: Partial<ThemeConfig>
}

/**
 * Moves pages to other routes: rules from a source path pattern to a page
 * path, or a function from the source path to the page path. Paths are
 * relative to srcDir and keep their `.md` extension.
 */
export type PageRewrites
  = | Record<string, string>
    | ((id: string) => string | undefined)

export interface SiteConfig {
  title?: string
  /** Description of pages that set none in frontmatter or locale config. */
  description?: string
  base?: string
  srcDir?: string
  /** Glob patterns, relative to `srcDir`, of Markdown files that are not pages. */
  srcExclude?: string[]
  rewrites?: PageRewrites
  publicDir?: string
  head?: HeadConfig[]
  themeConfig?: Partial<ThemeConfig>
  locales?: Record<string, LocaleConfig>
}

/**
 * The site config with every default applied and every value checked, after
 * all plugin `config()` hooks ran. Generator plugins read it in
 * `configResolved()` instead of repeating KawaPress's defaults.
 */
export interface ResolvedSiteConfig {
  /** Absolute path of the site root, the folder of `kawapress.config.ts`. */
  readonly root: string
  readonly title: string
  readonly description?: string
  /** Deploy path, always starting and ending with `/`. */
  readonly base: string
  /** Markdown source folder, relative to `root`. */
  readonly srcDir: string
  readonly srcExclude: readonly string[]
  readonly rewrites: PageRewrites | undefined
  /** Public folder, relative to `srcDir`. */
  readonly publicDir: string
  readonly head: readonly HeadConfig[]
  readonly themeConfig: Readonly<Partial<ThemeConfig>>
  /** Every locale; a site without `locales` has an English `root` locale. */
  readonly locales: Readonly<Record<string, LocaleConfig>>
}

/** Raw site data exposed to the client via virtual module. */
export interface SiteData {
  title: string
  description?: string
  base: string
  head: HeadConfig[]
  themeConfig?: Partial<ThemeConfig>
  locales: Record<string, LocaleConfig>
}

/** Site data resolved for the current route and locale. */
export interface ResolvedSiteData {
  title: string
  /** Description of the current locale, falling back to the site description. */
  description?: string
  base: string
  themeConfig: Partial<ThemeConfig>
  localeIndex: string
  label?: string
  lang?: string
  dir?: LocaleDirection
  link: string
  /** `<head>` tags from the site config, shared by every page. */
  head: HeadConfig[]
  /** `<head>` tags of the current locale, rendered after the site tags. */
  localeHead: HeadConfig[]
}

export interface LocaleLink {
  localeIndex: string
  label: string
  link: string
  lang?: string
  dir?: LocaleDirection
}

export interface PageHeader {
  level: number
  title: string
  slug: string
  link: string
  children: PageHeader[]
}

export function assertPageDataSerializable(pageData: PageData): void {
  const route = typeof pageData.path === 'string'
    ? JSON.stringify(pageData.path)
    : '<unknown route>'
  assertJsonSerializable(pageData, {
    label: `pageData for route ${route}`,
    path: 'pageData',
  })
}
