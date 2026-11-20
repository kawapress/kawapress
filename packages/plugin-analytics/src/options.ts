export interface GoogleAnalyticsOptions {
  /** Measurement ID of a GA4 property, for example `G-XXXXXXX`. */
  id: string
}

export interface PlausibleOptions {
  /** Domain registered in Plausible, without protocol or path. */
  domain: string
  /** Script URL. Change it when you self-host Plausible. */
  src?: string
}

export interface UmamiOptions {
  /** Website ID shown in the Umami dashboard. */
  websiteId: string
  /** Script URL. Umami has no shared official address, so it is required. */
  src: string
}

export interface CloudflareAnalyticsOptions {
  /** Site token of Cloudflare Web Analytics. */
  token: string
}

export interface AnalyticsPluginOptions {
  google?: GoogleAnalyticsOptions
  plausible?: PlausibleOptions
  umami?: UmamiOptions
  cloudflare?: CloudflareAnalyticsOptions
  /** Inject the scripts during `kawapress dev` too. Defaults to `false`. */
  dev?: boolean
}

export interface ResolvedAnalyticsOptions {
  google?: GoogleAnalyticsOptions
  plausible?: Required<PlausibleOptions>
  umami?: UmamiOptions
  cloudflare?: CloudflareAnalyticsOptions
  dev: boolean
}

export const PLAUSIBLE_DEFAULT_SRC = 'https://plausible.io/js/script.js'

const SERVICES = ['google', 'plausible', 'umami', 'cloudflare'] as const
const GOOGLE_ID_PATTERN = /^G-[A-Z0-9]+$/i

/**
 * Validates the options at config time. Every error names the option that is
 * wrong, so a typo is fixed without reading the plugin source.
 */
export function resolveAnalyticsOptions(
  options: AnalyticsPluginOptions | undefined,
): ResolvedAnalyticsOptions {
  if (!options || typeof options !== 'object') {
    throw new Error(
      'KawaPress Analytics: analyticsPlugin() needs at least one service, '
      + 'for example analyticsPlugin({ plausible: { domain: "example.com" } }).',
    )
  }

  const resolved: ResolvedAnalyticsOptions = {
    dev: resolveBoolean(options.dev, 'dev'),
  }

  if (options.google !== undefined) {
    const section = requireSection(options.google, 'google')
    const id = requireText(section.id, 'google.id', 'For example "G-XXXXXXX".')
    if (/^UA-/i.test(id)) {
      throw new Error(
        'KawaPress Analytics: "google.id" looks like a Universal Analytics ID '
        + `(${JSON.stringify(id)}), which Google no longer processes. Use the GA4 measurement ID that starts with "G-".`,
      )
    }
    if (!GOOGLE_ID_PATTERN.test(id)) {
      throw new Error(
        `KawaPress Analytics: "google.id" must be a GA4 measurement ID such as "G-XXXXXXX", got ${JSON.stringify(id)}.`,
      )
    }
    resolved.google = { id }
  }

  if (options.plausible !== undefined) {
    const section = requireSection(options.plausible, 'plausible')
    const domain = requireText(section.domain, 'plausible.domain', 'For example "example.com".')
    if (/[/\s]/.test(domain)) {
      throw new Error(
        `KawaPress Analytics: "plausible.domain" must be a bare domain like "example.com", got ${JSON.stringify(domain)}.`,
      )
    }
    resolved.plausible = {
      domain,
      src: section.src === undefined
        ? PLAUSIBLE_DEFAULT_SRC
        : requireUrl(section.src, 'plausible.src'),
    }
  }

  if (options.umami !== undefined) {
    const section = requireSection(options.umami, 'umami')
    resolved.umami = {
      websiteId: requireText(section.websiteId, 'umami.websiteId', 'Copy it from the Umami dashboard.'),
      src: requireUrl(section.src, 'umami.src'),
    }
  }

  if (options.cloudflare !== undefined) {
    const section = requireSection(options.cloudflare, 'cloudflare')
    resolved.cloudflare = {
      token: requireText(section.token, 'cloudflare.token', 'Copy the site token from Cloudflare Web Analytics.'),
    }
  }

  if (!SERVICES.some(service => resolved[service] !== undefined)) {
    throw new Error(
      'KawaPress Analytics: configure at least one of '
      + `${SERVICES.map(service => `"${service}"`).join(', ')}.`,
    )
  }

  return resolved
}

function requireSection<T extends object>(value: T, name: string): T {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`KawaPress Analytics: "${name}" must be an object, got ${JSON.stringify(value)}.`)
  }
  return value
}

function requireText(value: unknown, name: string, hint: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`KawaPress Analytics: "${name}" is required and must be a non-empty string. ${hint}`)
  }
  return value.trim()
}

function requireUrl(value: unknown, name: string): string {
  const text = requireText(value, name, 'Use the full script URL, starting with https://.')
  let url: URL
  try {
    url = new URL(text)
  }
  catch {
    throw new Error(`KawaPress Analytics: "${name}" must be an absolute URL, got ${JSON.stringify(text)}.`)
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`KawaPress Analytics: "${name}" must start with https://, got ${JSON.stringify(text)}.`)
  }
  return text
}

function resolveBoolean(value: unknown, name: string): boolean {
  if (value === undefined) {
    return false
  }
  if (typeof value !== 'boolean') {
    throw new TypeError(`KawaPress Analytics: "${name}" must be true or false, got ${JSON.stringify(value)}.`)
  }
  return value
}
