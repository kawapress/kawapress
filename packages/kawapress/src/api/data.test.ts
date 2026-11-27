import type { DataLoaderContext } from './data'
import { describe, expectTypeOf, it } from 'vitest'
import { defineLoader } from './data'

describe('defineLoader types', () => {
  it('gives load() the context when there is no watch', () => {
    defineLoader({
      async load(context) {
        expectTypeOf(context).toEqualTypeOf<DataLoaderContext>()
        return context.read('a.json')
      },
    })
    defineLoader({
      async load({ read, glob }) {
        expectTypeOf(read).toEqualTypeOf<DataLoaderContext['read']>()
        expectTypeOf(glob).toEqualTypeOf<DataLoaderContext['glob']>()
        return (await glob('*.json')).length
      },
    })
  })

  it('gives load() the watched files first and the context second with watch', () => {
    defineLoader({
      watch: './catalog/*.json',
      async load(files, context) {
        expectTypeOf(files).toEqualTypeOf<string[]>()
        expectTypeOf(context).toEqualTypeOf<DataLoaderContext>()
        return files.length
      },
    })
    defineLoader({
      watch: ['./a/*.json'],
      load(files) {
        expectTypeOf(files).toEqualTypeOf<string[]>()
        return files
      },
    })
  })

  it('keeps the loaded data type', () => {
    const tracked = defineLoader({ load: () => ({ count: 1 }) })
    const watched = defineLoader({ watch: '*.json', load: files => files.length })
    expectTypeOf(tracked.load).returns.toEqualTypeOf<{ count: number } | Promise<{ count: number }>>()
    expectTypeOf(watched.load).returns.toEqualTypeOf<number | Promise<number>>()
  })

  it('rejects mixing the two forms', () => {
    // @ts-expect-error without watch, the first parameter is the context
    defineLoader({
      load(files: string[]) {
        return files
      },
    })
    // @ts-expect-error with watch, the first parameter is the file list
    defineLoader({
      watch: '*.json',
      load(context: DataLoaderContext) {
        return context
      },
    })
  })
})
