import type { UserConfig } from 'vite'
import type { KawapressConfig } from '../api/config'
import type { KawaPressPlugin } from '../api/plugin'
import type { DeadLinkIgnore, ResolvedDeadLinkConfig } from '../core/dead-links'
import type { LocaleConfig, PageRewrites, ResolvedSiteConfig, SiteConfig } from '../core/site'
import type { GeneratorPluginRunner } from '../plugin/generator-runner'
import { isAbsolute, resolve } from 'node:path'
import process from 'node:process'
import { normalizeBase } from '../core/base'
import { isPlainObject, resolveHeadConfig } from '../core/head'
import { createGeneratorPluginRunner } from '../plugin/generator-runner'

/** The resolved site config plus what only the generator itself uses. */
export interface GeneratorSiteConfig extends ResolvedSiteConfig {
  plugins: KawaPressPlugin[]
  vite: UserConfig | undefined
  runtimePlugin: string | undefined
  pluginRunner: GeneratorPluginRunner
  /** Internal link checking, or `false` when the site disabled it. */
  deadLinks: ResolvedDeadLinkConfig | false
}

const DEFAULT_LOCALES: Record<string, LocaleConfig> = {
  root: {
    label: 'English',
    lang: 'en',
  },
}

export interface ResolveSiteConfigOptions {
  /** Absolute path of the site root. */
  root?: string
}

export async function resolveSiteConfig(
  userConfig: KawapressConfig,
  options: ResolveSiteConfigOptions = {},
): Promise<GeneratorSiteConfig> {
  const plugins = userConfig.plugins ?? []
  const pluginRunner = await createGeneratorPluginRunner(plugins)
  const site: SiteConfig = {
    title: userConfig.title,
    description: userConfig.description,
    base: userConfig.base,
    srcDir: userConfig.srcDir,
    srcExclude: userConfig.srcExclude,
    rewrites: userConfig.rewrites,
    publicDir: userConfig.publicDir,
    head: userConfig.head,
    themeConfig: userConfig.themeConfig,
    locales: userConfig.locales,
  }
  await pluginRunner.runConfig(site)

  const srcDir = site.srcDir ?? '.'
  if (isAbsolute(srcDir)) {
    throw new Error(`KawaPress: srcDir must be relative to the site root, got ${JSON.stringify(srcDir)}`)
  }

  const srcExclude = resolveSrcExclude(site.srcExclude)
  const rewrites = resolveRewrites(site.rewrites)
  const publicDir = normalizePublicDir(site.publicDir ?? 'public')
  const description = resolveDescription(site.description, 'description')
  const head = resolveHeadConfig(site.head, {
    owner: 'the site config',
    path: 'head',
  })
  const locales = normalizeLocales(site.locales ?? DEFAULT_LOCALES)
  const deadLinks = resolveDeadLinks(userConfig.deadLinks)

  const resolved: ResolvedSiteConfig = Object.freeze({
    root: resolve(options.root ?? process.cwd()),
    title: site.title ?? 'KawaPress',
    ...(description === undefined ? {} : { description }),
    base: normalizeBase(site.base),
    srcDir,
    srcExclude,
    rewrites,
    publicDir,
    head,
    themeConfig: site.themeConfig ?? {},
    locales,
  })
  await pluginRunner.runConfigResolved(resolved)

  return {
    ...resolved,
    plugins,
    vite: userConfig.vite,
    runtimePlugin: userConfig.runtimePlugin,
    pluginRunner,
    deadLinks,
  }
}

function resolveDeadLinks(
  deadLinks: KawapressConfig['deadLinks'],
): ResolvedDeadLinkConfig | false {
  if (deadLinks === false) {
    return false
  }
  if (deadLinks === undefined) {
    return { level: 'error', ignore: [] }
  }
  if (typeof deadLinks !== 'object' || deadLinks === null || Array.isArray(deadLinks)) {
    throw new Error(
      `KawaPress: deadLinks must be false or an object, got ${JSON.stringify(deadLinks)} in kawapress.config.ts.`,
    )
  }

  const level = deadLinks.level ?? 'error'
  if (level !== 'error' && level !== 'warn') {
    throw new Error(
      `KawaPress: deadLinks.level must be "error" or "warn", got ${JSON.stringify(level)} in kawapress.config.ts.`,
    )
  }

  const ignore = deadLinks.ignore ?? []
  if (!Array.isArray(ignore)) {
    throw new TypeError(
      'KawaPress: deadLinks.ignore must be an array of strings, regular expressions, or functions in kawapress.config.ts.',
    )
  }
  ignore.forEach((entry, index) => {
    if (!isDeadLinkIgnore(entry)) {
      throw new Error(
        `KawaPress: deadLinks.ignore[${index}] must be a string, regular expression, or function, got ${describeValue(entry)} in kawapress.config.ts.`,
      )
    }
  })

  return { level, ignore: [...ignore] }
}

function isDeadLinkIgnore(value: unknown): value is DeadLinkIgnore {
  return typeof value === 'string'
    || typeof value === 'function'
    || value instanceof RegExp
}

function describeValue(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  return Array.isArray(value) ? 'an array' : typeof value
}

function resolveRewrites(rewrites: unknown): PageRewrites | undefined {
  if (rewrites === undefined || typeof rewrites === 'function') {
    return rewrites as PageRewrites | undefined
  }
  if (!isPlainObject(rewrites)) {
    throw new TypeError(
      `KawaPress: rewrites must be an object of path rules or a function, got ${describeValue(rewrites)} in kawapress.config.ts.`,
    )
  }
  for (const [from, to] of Object.entries(rewrites)) {
    if (typeof to !== 'string' || !to) {
      throw new TypeError(
        `KawaPress: rewrites[${JSON.stringify(from)}] must be a page path, got ${describeValue(to)} in kawapress.config.ts.`,
      )
    }
  }
  return rewrites as Record<string, string>
}

function resolveSrcExclude(srcExclude: unknown): string[] {
  if (srcExclude === undefined) {
    return []
  }
  if (!Array.isArray(srcExclude)) {
    throw new TypeError(
      `KawaPress: srcExclude must be an array of glob patterns, got ${describeValue(srcExclude)} in kawapress.config.ts.`,
    )
  }
  return srcExclude.map((pattern, index) => {
    if (typeof pattern !== 'string' || !pattern.trim() || isAbsolute(pattern)) {
      throw new Error(
        `KawaPress: srcExclude[${index}] must be a glob pattern relative to srcDir, got ${JSON.stringify(pattern)} in kawapress.config.ts.`,
      )
    }
    return pattern
  })
}

function normalizePublicDir(publicDir: string): string {
  if (!publicDir.trim()) {
    throw new Error('KawaPress: publicDir must not be empty')
  }
  return publicDir.replaceAll('\\', '/')
}

function resolveDescription(
  description: unknown,
  path: string,
): string | undefined {
  if (description === undefined) {
    return undefined
  }
  if (typeof description !== 'string') {
    throw new TypeError(
      `KawaPress: ${path} must be a string, got ${JSON.stringify(description)} in kawapress.config.ts.`,
    )
  }
  return description
}

function normalizeLocales(
  locales: Record<string, LocaleConfig>,
): Record<string, LocaleConfig> {
  const normalized: Record<string, LocaleConfig> = {}
  for (const [localeIndex, locale] of Object.entries(locales)) {
    validateLocale(localeIndex, locale)
    resolveDescription(locale.description, `locales.${localeIndex}.description`)
    const head = resolveHeadConfig(locale.head, {
      owner: `locale ${JSON.stringify(localeIndex)} in the site config`,
      path: `locales.${localeIndex}.head`,
    })
    normalized[localeIndex] = head.length === 0
      ? locale
      : { ...locale, head }
  }
  return normalized
}

function validateLocale(localeIndex: string, locale: LocaleConfig): void {
  if (!localeIndex || (localeIndex !== 'root' && /[/?#]/.test(localeIndex))) {
    throw new Error(
      `KawaPress: locale key ${JSON.stringify(localeIndex)} must be "root" or one URL path segment.`,
    )
  }
  if (!locale.label.trim()) {
    throw new Error(
      `KawaPress: locale ${JSON.stringify(localeIndex)} must have a non-empty label.`,
    )
  }
}
