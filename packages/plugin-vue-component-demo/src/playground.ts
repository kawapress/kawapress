import type { EventLogEntry, PlaygroundArgs, PlaygroundDoc } from './playground-types'

/** Number of event log lines that are kept. */
export const EVENT_LOG_LIMIT = 20
const PAYLOAD_MAX_LENGTH = 160
const MULTILINE_THRESHOLD = 80

/**
 * Reads the default value of a prop as written in the source. Only literals
 * are understood: quoted strings, numbers, `true`, `false` and `null`.
 * Anything else (factory functions, object literals, identifiers) is skipped,
 * because the playground cannot evaluate source text.
 */
export function parseDefault(text: string | undefined): { value: unknown } | undefined {
  if (text === undefined) {
    return undefined
  }
  const source = text.trim()
  if (source === 'true') {
    return { value: true }
  }
  if (source === 'false') {
    return { value: false }
  }
  if (source === 'null') {
    return { value: null }
  }
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(source)) {
    return { value: Number(source) }
  }
  const quote = source[0]
  if ((quote === '"' || quote === '\'' || quote === '`') && source.length >= 2 && source.endsWith(quote)) {
    const body = source.slice(1, -1)
    if (quote === '`' && body.includes('${')) {
      return undefined
    }
    return { value: unescapeString(body, quote) }
  }
  return undefined
}

function unescapeString(body: string, quote: string): string {
  return body.replaceAll(/\\(.)/g, (_match, char: string) => {
    if (char === 'n') {
      return '\n'
    }
    if (char === 't') {
      return '\t'
    }
    return char === quote || char === '\\' ? char : `\\${char}`
  })
}

/** Defaults of the props that have a readable one, by prop name. */
export function resolveDefaults(doc: PlaygroundDoc): PlaygroundArgs {
  const defaults: PlaygroundArgs = {}
  for (const prop of doc.props) {
    const parsed = parseDefault(prop.default)
    if (parsed) {
      defaults[prop.name] = parsed.value
    }
  }
  return defaults
}

/**
 * The first args of a playground: the `props` attribute wins over the default
 * of a prop; a prop with neither stays unset. The result only depends on the
 * doc and the attribute, so the server and the client agree.
 */
export function resolveInitialArgs(doc: PlaygroundDoc, initial: PlaygroundArgs = {}): PlaygroundArgs {
  return { ...resolveDefaults(doc), ...initial }
}

/** The listener key Vue looks up when a component emits `name`. */
export function toHandlerKey(name: string): string {
  const camel = name.replaceAll(/-(\w)/g, (_match, char: string) => char.toUpperCase())
  return `on${camel.charAt(0).toUpperCase()}${camel.slice(1)}`
}

/** Stringifies anything an event may carry without throwing, and cuts long text. */
export function safeStringify(value: unknown, maxLength = PAYLOAD_MAX_LENGTH): string {
  const seen = new WeakSet<object>()
  let text: string
  try {
    text = JSON.stringify(value, (_key, item: unknown) => {
      if (typeof item === 'bigint') {
        return `${item}n`
      }
      if (typeof item === 'function') {
        return `[Function ${item.name || 'anonymous'}]`
      }
      if (typeof item === 'symbol') {
        return item.toString()
      }
      if (typeof item === 'object' && item !== null) {
        if (typeof Event !== 'undefined' && item instanceof Event) {
          return `[Event ${item.type}]`
        }
        if (typeof (item as { nodeType?: unknown }).nodeType === 'number') {
          return '[Element]'
        }
        if (seen.has(item)) {
          return '[Circular]'
        }
        seen.add(item)
      }
      return item
    }) ?? String(value)
  }
  catch {
    text = String(value)
  }
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

/** Describes the arguments of one emit: nothing, the value itself, or a list. */
export function formatPayload(payload: unknown[]): string {
  if (payload.length === 0) {
    return ''
  }
  return safeStringify(payload.length === 1 ? payload[0] : payload)
}

/** Appends an entry and keeps the latest `limit` ones. */
export function appendLog(
  log: readonly EventLogEntry[],
  entry: EventLogEntry,
  limit = EVENT_LOG_LIMIT,
): EventLogEntry[] {
  const next = [...log, entry]
  return next.length > limit ? next.slice(next.length - limit) : next
}

export type SnippetToken = readonly [kind: 'punct' | 'tag' | 'attr' | 'string' | 'text', text: string]

export interface Snippet {
  code: string
  html: string
}

/**
 * The usage snippet for the current args: only args that differ from the
 * default are written. `true` is a bare attribute, strings are plain
 * attributes, everything else is a bound `:prop`.
 */
export function buildSnippet(name: string, doc: PlaygroundDoc, args: PlaygroundArgs): Snippet {
  const defaults = resolveDefaults(doc)
  const known = new Set(doc.props.map(prop => prop.name))
  const names = [
    ...doc.props.map(prop => prop.name),
    ...Object.keys(args).filter(key => !known.has(key)),
  ]

  const attributes: SnippetToken[][] = []
  for (const key of names) {
    if (!(key in args) || args[key] === undefined) {
      continue
    }
    const value = args[key]
    const isDefault = key in defaults
      ? jsonEqual(value, defaults[key])
      : value === false
    if (isDefault) {
      continue
    }
    attributes.push(attributeTokens(toKebab(key), value))
  }

  const inline = joinTokens(name, attributes, false)
  const multiline = tokensToCode(inline).length > MULTILINE_THRESHOLD && attributes.length > 1
  const tokens = multiline ? joinTokens(name, attributes, true) : inline
  return { code: tokensToCode(tokens), html: tokensToHtml(tokens) }
}

function attributeTokens(name: string, value: unknown): SnippetToken[] {
  if (value === true) {
    return [['attr', name]]
  }
  if (typeof value === 'string') {
    return [['attr', name], ['punct', '='], ['string', `"${escapeAttribute(value)}"`]]
  }
  const json = safeJson(value)
  const quoted = json.includes('"')
    ? `'${json.replaceAll('\'', '&#39;')}'`
    : `"${json}"`
  return [['attr', `:${name}`], ['punct', '='], ['string', quoted]]
}

function joinTokens(name: string, attributes: SnippetToken[][], multiline: boolean): SnippetToken[] {
  const tokens: SnippetToken[] = [['punct', '<'], ['tag', name]]
  for (const attribute of attributes) {
    tokens.push(['text', multiline ? '\n  ' : ' '], ...attribute)
  }
  tokens.push(multiline ? ['text', '\n'] : ['text', ' '], ['punct', '/>'])
  return tokens
}

function tokensToCode(tokens: readonly SnippetToken[]): string {
  return tokens.map(token => token[1]).join('')
}

function tokensToHtml(tokens: readonly SnippetToken[]): string {
  const body = tokens
    .map(([kind, text]) => (kind === 'text' ? escapeHtml(text) : `<span class="kawa-playground-token kawa-playground-token--${kind}">${escapeHtml(text)}</span>`))
    .join('')
  return `<pre class="kawa-playground-code"><code class="language-vue">${body}</code></pre>`
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? 'undefined'
  }
  catch {
    return 'undefined'
  }
}

function jsonEqual(a: unknown, b: unknown): boolean {
  return a === b || safeJson(a) === safeJson(b)
}

function toKebab(name: string): string {
  return name.replaceAll(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase()
}

function escapeAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}
