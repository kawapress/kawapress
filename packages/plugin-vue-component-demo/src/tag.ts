/** Attributes of a `<ComponentDemo>` tag, as written in Markdown. */
export interface DemoTagAttributes {
  src?: string
  component?: string
  title?: string
  description?: string
  props?: string
  clientOnly: boolean
}

const ALLOWED_ATTRIBUTES = ['src', 'component', 'title', 'description', 'client-only', 'props']
const ATTRIBUTE_RE = /\s+([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/y

export class DemoTagError extends Error {}

/**
 * Reads a tag that stands on its own: `<Tag a="1" b />` or `<Tag a="1"></Tag>`.
 * Returns `undefined` when `html` is not that tag, so other HTML passes through.
 */
export function parseDemoTag(html: string, tag: string): DemoTagAttributes | undefined {
  const content = html.trim()
  if (!new RegExp(`^<${escapeRegExp(tag)}(?=[\\s/>])`).test(content)) {
    return undefined
  }

  const pairs = new Map<string, string | true>()
  let position = tag.length + 1
  while (true) {
    ATTRIBUTE_RE.lastIndex = position
    const match = ATTRIBUTE_RE.exec(content)
    if (!match) {
      break
    }
    position = ATTRIBUTE_RE.lastIndex
    const name = match[1]
    if (pairs.has(name)) {
      throw new DemoTagError(`the attribute "${name}" is written twice.`)
    }
    const value = match[2] ?? match[3] ?? match[4]
    pairs.set(name, value === undefined ? true : decodeEntities(value))
  }

  const rest = content.slice(position)
  if (!new RegExp(`^\\s*(?:/>|>\\s*</${escapeRegExp(tag)}\\s*>)$`).test(rest)) {
    throw new DemoTagError(
      `<${tag}> must stand alone in a block, closed as <${tag} ... /> and separated from other content by blank lines.`,
    )
  }

  for (const name of pairs.keys()) {
    if (!ALLOWED_ATTRIBUTES.includes(name)) {
      throw new DemoTagError(
        `unknown attribute ${JSON.stringify(name)} on <${tag}>. Supported attributes: ${ALLOWED_ATTRIBUTES.join(', ')}.`,
      )
    }
  }

  const text = (name: string): string | undefined => {
    const value = pairs.get(name)
    if (value === true) {
      throw new DemoTagError(`the attribute "${name}" needs a value.`)
    }
    return value
  }
  const clientOnly = pairs.get('client-only')

  return {
    src: text('src'),
    component: text('component'),
    title: text('title'),
    description: text('description'),
    props: text('props'),
    clientOnly: clientOnly !== undefined && clientOnly !== 'false',
  }
}

function decodeEntities(value: string): string {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', '\'')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
