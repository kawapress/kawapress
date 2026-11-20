/**
 * The part of the meta plugin's `ComponentDoc` that the playground reads. It is
 * copied here on purpose: the meta plugin is an optional companion, so this
 * package does not depend on it, not even for types. The data is plain JSON.
 */
export interface PlaygroundDoc {
  /** Component name; may be empty, the page then passes the file name. */
  name: string
  props: PlaygroundProp[]
  events: PlaygroundEvent[]
}

export interface PlaygroundProp {
  name: string
  type: string
  required: boolean
  default?: string
  description: string
  control: PlaygroundControl
}

export type PlaygroundControl
  = | { kind: 'boolean' }
    | { kind: 'number' }
    | { kind: 'text' }
    | { kind: 'select', options: (string | number)[] }
    | { kind: 'json' }
    | { kind: 'none' }

export interface PlaygroundEvent {
  name: string
  description: string
  type: string
}

export type PlaygroundArgs = Record<string, unknown>

export interface EventLogEntry {
  id: number
  name: string
  /** JSON of the payload, empty when the event carries none. */
  payload: string
}
