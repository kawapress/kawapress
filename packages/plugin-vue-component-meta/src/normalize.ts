import type {
  ComponentDoc,
  EventDoc,
  ExposedDoc,
  PropControl,
  PropDoc,
  SlotDoc,
} from './types'

/**
 * The parts of `vue-component-meta`'s output that the normalizer reads. Kept
 * structural so this module never imports the checker, and tests can feed it
 * plain objects.
 */
export interface RawTag {
  name: string
  text?: string
}

export type RawSchema = string | { kind: string, type?: string, schema?: unknown }

export interface RawProp {
  name: string
  global?: boolean
  required?: boolean
  default?: string
  description?: string
  tags?: RawTag[]
  type: string
  schema?: RawSchema
}

export interface RawNamed {
  name: string
  type: string
  description?: string
  tags?: RawTag[]
}

export interface RawMeta {
  props: RawProp[]
  events: RawNamed[]
  slots: RawNamed[]
  exposed: RawNamed[]
}

export interface NormalizeOptions {
  /** File name without extension, the fallback component name. */
  fallbackName: string
  /** The component is a `<script setup generic>` one. */
  generic?: boolean
  /** Description from the JSDoc of the component, when the caller found one. */
  description?: string
}

/** Controls a `@control` tag can force. `select` needs options, so it is only inferred. */
const OVERRIDABLE_CONTROLS = ['text', 'number', 'boolean', 'json', 'none'] as const
type OverridableControl = (typeof OVERRIDABLE_CONTROLS)[number]

const UNDEFINED_SUFFIX = ' | undefined'
const STRING_LITERAL_RE = /^"(?:[^"\\]|\\.)*"$/
const NUMBER_LITERAL_RE = /^-?\d+(?:\.\d+)?$/
const NON_EDITABLE_TYPE_RE = /\b(?:VNode|VNodeChild|Component|DefineComponent|Slot|Slots|Element|HTMLElement|Promise)\b/

export function normalizeComponentMeta(raw: RawMeta, options: NormalizeOptions): ComponentDoc {
  const props = raw.props
    .filter(prop => !prop.global)
    .map(normalizeProp)
    .filter((prop): prop is PropDoc => prop !== undefined)

  const doc: ComponentDoc = {
    name: options.fallbackName,
    description: options.description ?? '',
    props,
    events: raw.events.map(normalizeEvent),
    slots: raw.slots.map(normalizeSlot),
    exposed: raw.exposed.map(normalizeExposed),
  }
  if (options.generic && props.length === 0) {
    doc.unsupported = 'generic'
  }
  return doc
}

function normalizeProp(raw: RawProp): PropDoc | undefined {
  const tags = normalizeTags(raw.tags)
  if ('ignore' in tags) {
    return undefined
  }

  const prop: PropDoc = {
    name: raw.name,
    type: stripUndefined(raw.type),
    required: raw.required === true,
    description: raw.description ?? '',
    tags,
    control: applyControlOverride(inferControl(raw), tags.control),
  }
  if (raw.default !== undefined) {
    prop.default = raw.default
  }
  return prop
}

function normalizeEvent(raw: RawNamed): EventDoc {
  return {
    name: raw.name,
    description: raw.description ?? '',
    type: raw.type,
    tags: normalizeTags(raw.tags),
  }
}

function normalizeSlot(raw: RawNamed): SlotDoc {
  return {
    name: raw.name,
    description: raw.description ?? '',
    type: raw.type,
    tags: normalizeTags(raw.tags),
  }
}

function normalizeExposed(raw: RawNamed): ExposedDoc {
  return {
    name: raw.name,
    type: raw.type,
    description: raw.description ?? '',
    tags: normalizeTags(raw.tags),
  }
}

function normalizeTags(tags: RawTag[] | undefined): Record<string, string> {
  const result: Record<string, string> = {}
  for (const tag of tags ?? []) {
    const text = tag.text?.trim() ?? ''
    result[tag.name] = tag.name in result && text
      ? `${result[tag.name]}\n${text}`.trim()
      : text
  }
  return result
}

/** `string | undefined` → `string`, `((e: Event) => void) | undefined` → `(e: Event) => void`. */
export function stripUndefined(type: string): string {
  let text = type.trim()
  if (text.endsWith(UNDEFINED_SUFFIX)) {
    text = text.slice(0, -UNDEFINED_SUFFIX.length).trim()
  }
  else if (text.startsWith('undefined | ')) {
    text = text.slice('undefined | '.length).trim()
  }
  return wrapsWholeType(text) ? text.slice(1, -1).trim() : text
}

function wrapsWholeType(text: string): boolean {
  if (!text.startsWith('(') || !text.endsWith(')')) {
    return false
  }
  let depth = 0
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === '(') {
      depth++
    }
    else if (char === ')') {
      depth--
      // The first parenthesis closed before the end: `(a) => (b)`.
      if (depth === 0 && index < text.length - 1) {
        return false
      }
    }
  }
  return true
}

/** Reads the editable kind of a prop from its type schema. */
export function inferControl(prop: Pick<RawProp, 'type' | 'schema'>): PropControl {
  const variants = collectVariants(prop.schema, prop.type)
  const present = variants.filter(variant => variant !== 'undefined')

  if (present.length === 0) {
    return { kind: 'none' }
  }
  if (present.some(isFunctionVariant) || NON_EDITABLE_TYPE_RE.test(prop.type)) {
    return { kind: 'none' }
  }
  if (present.every(variant => variant === 'true' || variant === 'false' || variant === 'boolean')) {
    return { kind: 'boolean' }
  }
  if (present.every(variant => typeof variant === 'string' && (
    STRING_LITERAL_RE.test(variant) || NUMBER_LITERAL_RE.test(variant)
  ))) {
    return {
      kind: 'select',
      options: (present as string[]).map(variant => (
        STRING_LITERAL_RE.test(variant) ? JSON.parse(variant) as string : Number(variant)
      )),
    }
  }
  if (present.length === 1 && present[0] === 'string') {
    return { kind: 'text' }
  }
  if (present.length === 1 && present[0] === 'number') {
    return { kind: 'number' }
  }
  return { kind: 'json' }
}

type Variant = string | { kind: string, type?: string, schema?: unknown }

/** Flattens a top-level union into its members. */
function collectVariants(schema: RawSchema | undefined, type: string): Variant[] {
  if (schema === undefined) {
    // Without a schema only the type text is left to go by.
    return stripUndefined(type).split(' | ').map(part => part.trim())
  }
  if (typeof schema === 'string') {
    return [schema]
  }
  if (schema.kind === 'enum' && Array.isArray(schema.schema)) {
    return schema.schema as Variant[]
  }
  return [schema]
}

function isFunctionVariant(variant: Variant): boolean {
  return typeof variant === 'object' && variant.kind === 'event'
}

function applyControlOverride(inferred: PropControl, override: string | undefined): PropControl {
  if (!override) {
    return inferred
  }
  const kind = override.trim().toLowerCase()
  return OVERRIDABLE_CONTROLS.includes(kind as OverridableControl)
    ? { kind: kind as OverridableControl }
    : inferred
}
