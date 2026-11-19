import { Buffer } from 'node:buffer'
import { deflateSync } from 'node:zlib'

export const PLAYGROUND_ORIGIN = 'https://play.vuejs.org/'

export interface ReplImportMap {
  imports?: Record<string, string>
  scopes?: Record<string, Record<string, string>>
}

export interface ReplFile {
  /** File name inside the REPL, for example `App.vue`. */
  name: string
  code: string
}

/**
 * Link that opens `files` in play.vuejs.org without loading the REPL.
 *
 * The hash is what `store.serialize()` of `@vue/repl` writes: `#` followed by
 * the base64 of the zlib-compressed JSON of `{ [fileName]: code }`. The entry
 * file goes first because the Playground takes the first file as its entry when
 * there is no `App.vue`. A custom import map travels as `import-map.json` on top
 * of the Vue entries the Playground already has.
 */
export function createPlaygroundUrl(
  files: readonly ReplFile[],
  main: string,
  importMap?: ReplImportMap,
): string {
  const payload: Record<string, string> = {}
  const entry = files.find(file => file.name === main)
  const ordered = entry ? [entry, ...files.filter(other => other !== entry)] : files
  for (const file of ordered) {
    payload[file.name] = file.code
  }
  if (importMap && (hasEntries(importMap.imports) || hasEntries(importMap.scopes))) {
    payload['import-map.json'] = JSON.stringify(importMap, null, 2)
  }
  const compressed = deflateSync(Buffer.from(JSON.stringify(payload), 'utf8'), { level: 9 })
  return `${PLAYGROUND_ORIGIN}#${compressed.toString('base64')}`
}

function hasEntries(value: object | undefined): boolean {
  return value !== undefined && Object.keys(value).length > 0
}
