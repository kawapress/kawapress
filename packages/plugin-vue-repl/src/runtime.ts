import type { Component } from 'vue'
import { mergeImportMap, Repl, useStore, useVueImportMap } from '@vue/repl'
import { computed } from 'vue'

/**
 * Everything that needs `@vue/repl`. The page component only reaches this module
 * through a dynamic `import()`, so none of it is in the first page load.
 */

export interface ReplRuntimeOptions {
  files: { name: string, code: string }[]
  main: string
  editor: 'codemirror' | 'monaco'
  importMap?: { imports?: Record<string, string>, scopes?: Record<string, Record<string, string>> }
}

export interface LoadedRepl {
  Repl: Component
  editor: Component
  store: ReturnType<typeof useStore>
}

export async function loadRepl(options: ReplRuntimeOptions): Promise<LoadedRepl> {
  const editor = options.editor === 'monaco'
    ? (await import('@vue/repl/monaco-editor')).default
    : (await import('@vue/repl/codemirror-editor')).default

  const { importMap: vueImportMap, vueVersion } = useVueImportMap()
  const builtinImportMap = computed(() => (
    options.importMap
      ? mergeImportMap(vueImportMap.value, options.importMap)
      : vueImportMap.value
  ))

  const store = useStore({ builtinImportMap, vueVersion })
  await store.setFiles(
    Object.fromEntries(options.files.map(file => [`src/${file.name}`, file.code])),
    `src/${options.main}`,
  )
  return { Repl: Repl as Component, editor: editor as Component, store }
}
