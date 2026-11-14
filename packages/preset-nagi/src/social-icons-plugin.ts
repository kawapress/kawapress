import type { LocaleConfig } from 'kawapress'
import type { Plugin } from 'vite'
import type { NagiSocialIcons, NagiSocialLink } from './social-links'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { parseJson, stringifyJson } from 'kawapress'

export const SOCIAL_ICONS_MODULE_ID = 'virtual:kawapress-nagi-social-icons'
const RESOLVED_ID = `\0${SOCIAL_ICONS_MODULE_ID}`
const ICON_SET = '@iconify-json/simple-icons/icons.json'

export interface NagiSocialIconsPluginOptions {
  /** Site `themeConfig`; only `socialLinks` is read. */
  themeConfig?: object | undefined
  /** Site locales, whose `themeConfig` can declare their own `socialLinks`. */
  locales?: Record<string, LocaleConfig> | undefined
}

interface IconifyIcon {
  body: string
  width?: number
  height?: number
}

interface IconifySet {
  icons: Record<string, IconifyIcon>
  aliases?: Record<string, { parent: string }>
  width?: number
  height?: number
}

/**
 * Publishes the SVG of every Simple Icons name the site writes in
 * `socialLinks`, so the browser gets the few icons in use and never the whole
 * set. The links are checked when the module is built.
 */
export function nagiSocialIconsPlugin(options: NagiSocialIconsPluginOptions): Plugin {
  return {
    name: 'kawapress:nagi-social-icons',
    resolveId(id) {
      if (id === SOCIAL_ICONS_MODULE_ID) {
        return RESOLVED_ID
      }
    },
    async load(id) {
      if (id !== RESOLVED_ID) {
        return
      }
      const icons = await resolveSocialIcons(collectSocialLinks(options))
      return `export const socialIcons = ${stringifyJson(icons, {
        label: 'nagi social icons',
        path: 'socialIcons',
      })}\n`
    },
  }
}

/** Every `socialLinks` entry of the site and its locales, checked. */
export function collectSocialLinks(options: NagiSocialIconsPluginOptions): NagiSocialLink[] {
  const sources: [string, unknown][] = [['themeConfig', options.themeConfig]]
  for (const [key, locale] of Object.entries(options.locales ?? {})) {
    sources.push([`locales[${JSON.stringify(key)}].themeConfig`, locale.themeConfig])
  }
  return sources.flatMap(([path, themeConfig]) => readSocialLinks(themeConfig, path))
}

/** SVG markup of each named icon in `links`. An unknown name is an error. */
export async function resolveSocialIcons(links: readonly NagiSocialLink[]): Promise<NagiSocialIcons> {
  const names = new Set(links.flatMap(link => typeof link.icon === 'string' ? [link.icon] : []))
  if (names.size === 0) {
    return {}
  }

  const set = await loadIconSet()
  const icons: Record<string, string> = {}
  for (const name of [...names].sort()) {
    const icon = set.icons[set.aliases?.[name]?.parent ?? name]
    if (!icon) {
      throw new Error(
        `KawaPress nagi: socialLinks icon ${JSON.stringify(name)} is not a Simple Icons name. `
        + 'Pick a name from https://simpleicons.org or pass the markup as { svg: \'<svg>…</svg>\' }.',
      )
    }
    const width = icon.width ?? set.width ?? 24
    const height = icon.height ?? set.height ?? 24
    icons[name] = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" aria-hidden="true">${icon.body}</svg>`
  }
  return icons
}

function readSocialLinks(themeConfig: unknown, path: string): NagiSocialLink[] {
  if (!isRecord(themeConfig)) {
    return []
  }
  if ('githubUrl' in themeConfig) {
    throw new TypeError(
      `KawaPress nagi: ${path}.githubUrl was replaced by socialLinks. `
      + 'Write socialLinks: [{ icon: \'github\', link: \'https://github.com/…\' }].',
    )
  }
  const links = themeConfig.socialLinks
  if (links === undefined) {
    return []
  }
  if (!Array.isArray(links)) {
    throw new TypeError(`KawaPress nagi: ${path}.socialLinks must be an array.`)
  }
  return links.map((link, index) => checkSocialLink(link, `${path}.socialLinks[${index}]`))
}

function checkSocialLink(value: unknown, path: string): NagiSocialLink {
  if (!isRecord(value)) {
    throw new TypeError(`KawaPress nagi: ${path} must be an object.`)
  }
  const { icon, link, ariaLabel } = value
  const isNamed = typeof icon === 'string' && icon.length > 0
  const isMarkup = isRecord(icon) && typeof icon.svg === 'string' && icon.svg.length > 0
  if (!isNamed && !isMarkup) {
    throw new TypeError(`KawaPress nagi: ${path}.icon must be a Simple Icons name or { svg: string }.`)
  }
  if (typeof link !== 'string' || link.length === 0) {
    throw new TypeError(`KawaPress nagi: ${path}.link must be a non-empty string.`)
  }
  if (ariaLabel !== undefined && typeof ariaLabel !== 'string') {
    throw new TypeError(`KawaPress nagi: ${path}.ariaLabel must be a string.`)
  }
  return value as unknown as NagiSocialLink
}

async function loadIconSet(): Promise<IconifySet> {
  const file = createRequire(import.meta.url).resolve(ICON_SET)
  return parseJson<IconifySet>(await readFile(file, 'utf8'), { label: ICON_SET })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
