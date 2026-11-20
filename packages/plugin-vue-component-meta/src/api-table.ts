import type { ComponentApiLabels } from './labels'
import type { ComponentDoc } from './types'

/**
 * The API tables as plain data. The page component renders them as HTML and
 * `renderApiMarkdown()` renders the same data as Markdown tables for the page's
 * `.md` output, so the two cannot drift apart.
 */

export type ApiSection = 'props' | 'events' | 'slots' | 'exposed'

export const API_SECTIONS: readonly ApiSection[] = ['props', 'events', 'slots', 'exposed']

export interface ApiNote {
  kind: 'deprecated' | 'since'
  /** Already labelled, for example `Deprecated: use size`. */
  text: string
}

export interface ApiCell {
  text: string
  /** Shown in monospace. */
  code?: boolean
  /** Struck through, for deprecated names. */
  strike?: boolean
  notes?: ApiNote[]
}

export interface ApiTable {
  section: ApiSection
  title: string
  columns: string[]
  rows: ApiCell[][]
}

export interface ApiModel {
  /** Set when the component cannot be read, instead of tables. */
  notice?: string
  tables: ApiTable[]
}

const NO_VALUE = '—'

export function buildApiModel(
  doc: ComponentDoc,
  labels: ComponentApiLabels,
  only?: ApiSection,
): ApiModel {
  if (doc.unsupported === 'generic') {
    return { notice: labels.genericUnsupported, tables: [] }
  }

  const sections = only ? [only] : API_SECTIONS
  const tables = sections.flatMap((section) => {
    const table = buildTable(doc, section, labels)
    return table.rows.length > 0 ? [table] : []
  })
  return { tables, notice: tables.length === 0 ? labels.empty : undefined }
}

function buildTable(doc: ComponentDoc, section: ApiSection, labels: ComponentApiLabels): ApiTable {
  switch (section) {
    case 'props':
      return {
        section,
        title: labels.props,
        columns: [labels.name, labels.type, labels.default, labels.required, labels.description],
        rows: doc.props.map(prop => [
          nameCell(prop.name, prop.tags),
          { text: prop.type, code: true },
          prop.default === undefined ? { text: NO_VALUE } : { text: prop.default, code: true },
          { text: prop.required ? labels.yes : NO_VALUE },
          descriptionCell(prop.description, prop.tags, labels),
        ]),
      }
    case 'events':
      return {
        section,
        title: labels.events,
        columns: [labels.name, labels.payload, labels.description],
        rows: doc.events.map(event => [
          nameCell(event.name, event.tags),
          typeCell(event.type, ['[]']),
          descriptionCell(event.description, event.tags, labels),
        ]),
      }
    case 'slots':
      return {
        section,
        title: labels.slots,
        columns: [labels.name, labels.bindings, labels.description],
        rows: doc.slots.map(slot => [
          nameCell(slot.name, slot.tags),
          typeCell(slot.type, ['any', '{}', '{ }']),
          descriptionCell(slot.description, slot.tags, labels),
        ]),
      }
    case 'exposed':
      return {
        section,
        title: labels.exposed,
        columns: [labels.name, labels.type, labels.description],
        rows: doc.exposed.map(member => [
          nameCell(member.name, member.tags),
          typeCell(member.type, []),
          descriptionCell(member.description, member.tags, labels),
        ]),
      }
  }
}

function nameCell(name: string, tags: Record<string, string>): ApiCell {
  return { text: name, code: true, strike: 'deprecated' in tags }
}

/** A type column shows a dash when the type says "nothing": `any` for a slot without bindings, `[]` for an event without a payload. */
function typeCell(type: string, empty: string[]): ApiCell {
  const text = type.trim()
  return text === '' || empty.includes(text)
    ? { text: NO_VALUE }
    : { text, code: true }
}

function descriptionCell(
  description: string,
  tags: Record<string, string>,
  labels: ComponentApiLabels,
): ApiCell {
  const notes: ApiNote[] = []
  if ('deprecated' in tags) {
    notes.push({
      kind: 'deprecated',
      text: tags.deprecated ? `${labels.deprecated}: ${tags.deprecated}` : labels.deprecated,
    })
  }
  if (tags.since) {
    notes.push({ kind: 'since', text: `${labels.since} ${tags.since}` })
  }
  return { text: description, notes }
}

/** The tables as GitHub-flavored Markdown, for the page's `.md` output. */
export function renderApiMarkdown(model: ApiModel): string {
  if (model.notice) {
    return `${model.notice}\n`
  }
  return model.tables.map((table) => {
    const header = `| ${table.columns.join(' | ')} |`
    const divider = `| ${table.columns.map(() => '---').join(' | ')} |`
    const rows = table.rows.map(row => `| ${row.map(renderMarkdownCell).join(' | ')} |`)
    return [`### ${table.title}`, '', header, divider, ...rows, ''].join('\n')
  }).join('\n')
}

function renderMarkdownCell(cell: ApiCell): string {
  const text = escapeCell(cell.text, cell.code === true)
  let result = text
  if (text && cell.code) {
    result = `\`${text}\``
  }
  if (text && cell.strike) {
    result = `~~${result}~~`
  }
  const notes = (cell.notes ?? []).map(note => (
    note.kind === 'deprecated' ? `**${escapeCell(note.text, false)}**` : `*${escapeCell(note.text, false)}*`
  ))
  return [result, ...notes].filter(Boolean).join('<br>')
}

function escapeCell(text: string, code: boolean): string {
  // Backslashes inside a code span are literal; only the pipe needs a escape there.
  const escaped = code ? text.trim() : text.trim().replaceAll('\\', '\\\\')
  return escaped
    .replaceAll('|', '\\|')
    .replaceAll(/\r?\n/g, '<br>')
}
