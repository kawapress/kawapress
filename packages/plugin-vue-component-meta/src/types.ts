/**
 * The normalized description of one Vue component. The API tables and the demo
 * plugin's control panel only use this model, so neither has to understand
 * TypeScript types. Everything in it is plain JSON.
 */
export interface ComponentDoc {
  /** Name of the component: the `name` option when the checker finds one, else the file name. */
  name: string
  /** Description from the JSDoc of the props interface. */
  description: string
  props: PropDoc[]
  events: EventDoc[]
  slots: SlotDoc[]
  exposed: ExposedDoc[]
  /**
   * Set when the checker cannot read this component. `generic` is a
   * `<script setup generic="T">` component whose props could not be extracted.
   */
  unsupported?: 'generic'
}

export interface PropDoc {
  name: string
  /** Type text without `| undefined`. */
  type: string
  required: boolean
  /** Default value as written in the source. */
  default?: string
  description: string
  /** JSDoc tags such as `deprecated`, `since` and `control`. A tag without text has an empty string. */
  tags: Record<string, string>
  control: PropControl
}

export type PropControlKind = PropControl['kind']

/**
 * How a reader can edit a prop. `select` is a literal union of strings or
 * numbers, `json` covers objects, arrays and composite types such as
 * `string | number`, and `none` covers functions, VNodes, components and other
 * types that cannot be edited.
 */
export type PropControl
  = | { kind: 'boolean' }
    | { kind: 'number' }
    | { kind: 'text' }
    | { kind: 'select', options: (string | number)[] }
    | { kind: 'json' }
    | { kind: 'none' }

export interface EventDoc {
  name: string
  description: string
  /** Payload as a tuple type, for example `[value: number]`. */
  type: string
  tags: Record<string, string>
}

export interface SlotDoc {
  name: string
  description: string
  /** Type of the slot's bindings, for example `{ item: Item }`. `{}` or empty when there are none. */
  type: string
  tags: Record<string, string>
}

export interface ExposedDoc {
  name: string
  type: string
  description: string
  tags: Record<string, string>
}

export const PROP_CONTROL_KINDS: readonly PropControlKind[] = [
  'boolean',
  'number',
  'text',
  'select',
  'json',
  'none',
]
