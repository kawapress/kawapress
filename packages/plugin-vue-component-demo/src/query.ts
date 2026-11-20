import { CLIENT_QUERY, SOURCE_QUERY } from './constants'

export type DemoQueryKind = 'source' | 'client'

/**
 * The ids the generated page imports. `raw` keeps `@vitejs/plugin-vue` (and
 * other plugins that skip raw requests) from compiling the generated module as
 * if it were the `.vue` file it is named after. The module still belongs to the
 * demo file, so editing the demo file hot-updates it.
 */
export function createDemoQueryId(file: string, kind: DemoQueryKind): string {
  return `${file}?${kind === 'source' ? SOURCE_QUERY : CLIENT_QUERY}&raw`
}

export function parseDemoQueryId(id: string): { file: string, kind: DemoQueryKind } | undefined {
  const index = id.indexOf('?')
  if (index < 0) {
    return undefined
  }
  const params = new URLSearchParams(id.slice(index + 1))
  const file = id.slice(0, index)
  if (params.has(SOURCE_QUERY)) {
    return { file, kind: 'source' }
  }
  if (params.has(CLIENT_QUERY)) {
    return { file, kind: 'client' }
  }
  return undefined
}
