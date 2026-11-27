import { resolve } from 'node:path'
import { escapePath } from 'tinyglobby'
import { normalizePath } from 'vite'

/** A parameter of a template: `[name]` is one path segment, `[...name]` one or more. */
export interface TemplateParam {
  name: string
  rest: boolean
}

export interface RouteTemplate {
  source: string
  /** Path segments after the leading `/`; a route ending in `/` has a last segment of ''. */
  segments: readonly string[]
  params: readonly TemplateParam[]
}

export interface FileTemplate {
  source: string
  /** Absolute glob pattern that finds every file the template can match. */
  glob: string
  /** Absolute directory below which every match lies, to watch for new files. */
  baseDirectory: string
  /** Parameter values of a file path, or `undefined` when the path does not fit the template. */
  match: (file: string) => Record<string, string> | undefined
  params: readonly TemplateParam[]
}

/** Names the generator reads from an item next to the route parameters. */
const RESERVED_PARAM_NAMES = new Set(['markdown', 'frontmatter'])
const PARAM_TOKEN_RE = /\[(\.\.\.)?([^\]/]*)\]/g
const IDENTIFIER_RE = /^[A-Z_$][\w$]*$/i

/**
 * Reads a route template such as `/packages/[name]`. `label` names the
 * `pages()` call in every error.
 */
export function parseRouteTemplate(route: unknown, label: string): RouteTemplate {
  if (typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//')) {
    throw new Error(`KawaPress: ${label}: the route must be a string that starts with a single "/", got ${JSON.stringify(route)}.`)
  }
  const segments = route.slice(1).split('/')
  const params: TemplateParam[] = []
  for (const [index, segment] of segments.entries()) {
    if (segment === '' && index < segments.length - 1) {
      throw new Error(`KawaPress: ${label}: the route ${JSON.stringify(route)} has an empty segment.`)
    }
    if (!/[[\]]/.test(segment)) {
      continue
    }
    const token = /^\[(\.\.\.)?([^\]]*)\]$/.exec(segment)
    if (!token) {
      throw new Error(
        `KawaPress: ${label}: a parameter must take a whole segment, but ${JSON.stringify(segment)} mixes it with other text.`,
      )
    }
    params.push(toParam(token[1] !== undefined, token[2], label, params))
  }
  return { source: route, segments, params }
}

/** The route of a page: the parameters filled with values that are checked on the way. */
export function fillRouteTemplate(
  template: RouteTemplate,
  values: Readonly<Record<string, unknown>>,
  where: string,
): string {
  const filled = template.segments.map((segment) => {
    const param = /^\[(\.\.\.)?(.*)\]$/.exec(segment)
    return param ? readParamValue(values[param[2]], param[2], param[1] !== undefined, where) : segment
  })
  return `/${filled.join('/')}`
}

function readParamValue(value: unknown, name: string, rest: boolean, where: string): string {
  const shape = rest
    ? 'one or more path segments, without a leading or trailing "/"'
    : 'a non-empty string without "/"'
  if (typeof value !== 'string') {
    throw new TypeError(`${where}: the parameter ${JSON.stringify(name)} must be ${shape}, got ${value === undefined ? 'nothing' : JSON.stringify(value)}.`)
  }
  const valid = rest
    ? value !== '' && value.split('/').every(segment => segment !== '')
    : value !== '' && !value.includes('/')
  if (!valid) {
    throw new Error(`${where}: the parameter ${JSON.stringify(name)} must be ${shape}, got ${JSON.stringify(value)}.`)
  }
  return value
}

/**
 * Reads a file template such as `../packages/[name]/README.md` against the
 * site root. Its parameters must be the route's, with the same kind.
 */
export function parseFileTemplate(
  template: string,
  root: string,
  route: RouteTemplate,
  label: string,
): FileTemplate {
  const absolute = normalizePath(resolve(root, template))
  const params: TemplateParam[] = []
  let glob = ''
  let pattern = ''
  let cursor = 0
  let baseEnd = absolute.length

  for (const token of absolute.matchAll(PARAM_TOKEN_RE)) {
    const literal = absolute.slice(cursor, token.index)
    const rest = token[1] !== undefined
    if (rest && !literal.endsWith('/')) {
      throw new Error(
        `KawaPress: ${label}: in the file template ${JSON.stringify(template)}, "[...${token[2]}]" must start its path segment.`,
      )
    }
    if (params.length === 0) {
      baseEnd = absolute.lastIndexOf('/', token.index) + 1
    }
    params.push(toParam(rest, token[2], label, params))
    glob += escapePath(literal) + (rest ? '**/*' : '*')
    pattern += escapeRegExp(literal) + (rest ? '(.+)' : '([^/]+)')
    cursor = token.index + token[0].length
  }
  const tail = absolute.slice(cursor)
  glob += escapePath(tail)
  pattern += escapeRegExp(tail)

  assertSameParams(route, params, template, label)
  const matcher = new RegExp(`^${pattern}$`)
  return {
    source: template,
    glob,
    baseDirectory: absolute.slice(0, baseEnd).replace(/\/$/, '') || '/',
    params,
    match(file) {
      const found = matcher.exec(normalizePath(file))
      return found ? Object.fromEntries(params.map((param, index) => [param.name, found[index + 1]])) : undefined
    },
  }
}

function assertSameParams(
  route: RouteTemplate,
  fileParams: readonly TemplateParam[],
  template: string,
  label: string,
): void {
  const describe = (params: readonly TemplateParam[]) => (
    params.length === 0 ? 'none' : params.map(param => `[${param.rest ? '...' : ''}${param.name}]`).join(', ')
  )
  const same = route.params.length === fileParams.length
    && route.params.every(param => fileParams.some(other => other.name === param.name && other.rest === param.rest))
  if (!same) {
    throw new Error(
      `KawaPress: ${label}: the route has the parameters ${describe(route.params)} but the file template ${JSON.stringify(template)} has ${describe(fileParams)}. They must be the same.`,
    )
  }
}

function toParam(
  rest: boolean,
  name: string,
  label: string,
  seen: readonly TemplateParam[],
): TemplateParam {
  if (!IDENTIFIER_RE.test(name)) {
    throw new Error(`KawaPress: ${label}: ${JSON.stringify(name)} is not a valid parameter name; use a JavaScript identifier.`)
  }
  if (RESERVED_PARAM_NAMES.has(name)) {
    throw new Error(`KawaPress: ${label}: ${JSON.stringify(name)} cannot be a parameter name, because a page item uses it already.`)
  }
  if (seen.some(param => param.name === name)) {
    throw new Error(`KawaPress: ${label}: the parameter ${JSON.stringify(name)} is used more than once.`)
  }
  return { name, rest }
}

function escapeRegExp(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}
