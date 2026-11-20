import { Buffer } from 'node:buffer'
import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { createPlaygroundUrl } from './playground'

/** The reverse of `@vue/repl`'s `utoa()`, as its `deserialize()` applies it. */
function decode(url: string): Record<string, string> {
  const hash = new URL(url).hash.slice(1)
  const binary = Buffer.from(hash, 'base64')
  // `atou()` only treats the hash as compressed when it starts with a zlib header.
  expect(binary.toString('latin1').startsWith('xÚ')).toBe(true)
  return JSON.parse(inflateSync(binary).toString('utf8'))
}

describe('createPlaygroundUrl', () => {
  it('serializes the files the way the Playground reads them', () => {
    const url = createPlaygroundUrl([{ name: 'App.vue', code: '<template>你好 {{ a }}</template>' }], 'App.vue')

    expect(url.startsWith('https://play.vuejs.org/#')).toBe(true)
    expect(decode(url)).toEqual({ 'App.vue': '<template>你好 {{ a }}</template>' })
  })

  it('puts the entry file first', () => {
    const url = createPlaygroundUrl([
      { name: 'store.ts', code: 'export {}' },
      { name: 'Main.vue', code: '<template />' },
    ], 'Main.vue')

    expect(Object.keys(decode(url))).toEqual(['Main.vue', 'store.ts'])
  })

  it('adds a custom import map as import-map.json', () => {
    const importMap = { imports: { 'my-ui': 'https://cdn.example.com/my-ui.js' } }
    const url = createPlaygroundUrl([{ name: 'App.vue', code: '' }], 'App.vue', importMap)

    expect(JSON.parse(decode(url)['import-map.json'])).toEqual(importMap)
  })

  it('leaves out an empty import map', () => {
    const url = createPlaygroundUrl([{ name: 'App.vue', code: '' }], 'App.vue', { imports: {} })
    expect(decode(url)['import-map.json']).toBeUndefined()
  })
})
