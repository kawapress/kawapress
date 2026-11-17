import type { HeadConfig } from '../core/head'
import { describe, expect, it } from 'vitest'
import { resolveSiteConfig } from './config'

describe('resolveSiteConfig', () => {
  it('uses public as the default public directory', async () => {
    const config = await resolveSiteConfig({})

    expect(config.publicDir).toBe('public')
  })

  it('keeps public directories inside or outside srcDir', async () => {
    expect((await resolveSiteConfig({ publicDir: './site-assets/' })).publicDir)
      .toBe('./site-assets/')
    expect((await resolveSiteConfig({ publicDir: '../public' })).publicDir)
      .toBe('../public')
    expect((await resolveSiteConfig({ publicDir: '/tmp/site-public' })).publicDir)
      .toBe('/tmp/site-public')
  })

  it('rejects an empty public directory', async () => {
    await expect(resolveSiteConfig({ publicDir: '' })).rejects.toThrow(
      'publicDir must not be empty',
    )
  })

  it('keeps site Vite and runtime plugin configuration', async () => {
    const config = await resolveSiteConfig({
      vite: { server: { fs: { strict: false } } },
      runtimePlugin: './site-runtime.ts',
    })
    expect(config.vite?.server?.fs?.strict).toBe(false)
    expect(config.runtimePlugin).toBe('./site-runtime.ts')
  })
})

describe('srcExclude', () => {
  it('defaults to no excluded files and keeps the configured patterns', async () => {
    expect((await resolveSiteConfig({})).srcExclude).toEqual([])
    expect((await resolveSiteConfig({ srcExclude: ['snippets/**'] })).srcExclude)
      .toEqual(['snippets/**'])
  })

  it('rejects a value that is not a list of relative patterns', async () => {
    await expect(resolveSiteConfig({ srcExclude: 'snippets/**' as never }))
      .rejects
      .toThrow('srcExclude must be an array of glob patterns')
    await expect(resolveSiteConfig({ srcExclude: ['/abs/**'] }))
      .rejects
      .toThrow('srcExclude[0] must be a glob pattern relative to srcDir')
  })
})

describe('rewrites', () => {
  it('keeps path rules and functions as they are', async () => {
    const rules = { 'packages/:pkg/src/:page*': ':pkg/:page*' }
    const rewrite = (id: string) => id

    expect((await resolveSiteConfig({})).rewrites).toBeUndefined()
    expect((await resolveSiteConfig({ rewrites: rules })).rewrites).toBe(rules)
    expect((await resolveSiteConfig({ rewrites: rewrite })).rewrites).toBe(rewrite)
  })

  it('rejects a value that is neither path rules nor a function', async () => {
    await expect(resolveSiteConfig({ rewrites: ['a.md'] as never }))
      .rejects
      .toThrow('rewrites must be an object of path rules or a function, got an array')
    await expect(resolveSiteConfig({ rewrites: { 'a.md': 1 } as never }))
      .rejects
      .toThrow('rewrites["a.md"] must be a page path, got number')
  })
})

describe('head config', () => {
  it('defaults to no head tags', async () => {
    const config = await resolveSiteConfig({})

    expect(config.head).toEqual([])
    expect(config.locales.root.head).toBeUndefined()
  })

  it('keeps site and locale head tags', async () => {
    const config = await resolveSiteConfig({
      head: [['meta', { property: 'og:image', content: '/social.png' }]],
      locales: {
        root: { label: 'English' },
        en: {
          label: 'English',
          head: [['script', { src: 'https://example.com/a.js', defer: true }]],
        },
      },
    })

    expect(config.head).toEqual([
      ['meta', { property: 'og:image', content: '/social.png' }],
    ])
    expect(config.locales.en.head).toEqual([
      ['script', { src: 'https://example.com/a.js', defer: true }],
    ])
  })

  it('reports the config path of an invalid site head tag', async () => {
    await expect(resolveSiteConfig({
      head: [['title', {}]] as unknown as HeadConfig[],
    })).rejects.toThrow('invalid head config in the site config.\nhead[0][0] must be one of')
  })

  it('reports the config path of an invalid locale head attribute', async () => {
    await expect(resolveSiteConfig({
      locales: {
        en: {
          label: 'English',
          head: [['meta', { name: 'description', content: 42 }]] as unknown as HeadConfig[],
        },
      },
    })).rejects.toThrow('locales.en.head[0][1].content must be a string or boolean')
  })
})

describe('resolveSiteConfig deadLinks', () => {
  it('checks dead links as errors by default', async () => {
    const config = await resolveSiteConfig({})

    expect(config.deadLinks).toEqual({ level: 'error', ignore: [] })
  })

  it('keeps warnings and ignore patterns', async () => {
    const ignore = [/^\/legacy/, 'https://example.com']
    const config = await resolveSiteConfig({
      deadLinks: {
        level: 'warn',
        ignore,
      },
    })

    expect(config.deadLinks).toEqual({ level: 'warn', ignore })
  })

  it('disables the check with false', async () => {
    const config = await resolveSiteConfig({ deadLinks: false })

    expect(config.deadLinks).toBe(false)
  })

  it('rejects an unknown level', async () => {
    await expect(resolveSiteConfig({
      deadLinks: { level: 'off' as never },
    })).rejects.toThrow('deadLinks.level must be "error" or "warn"')
  })

  it('rejects a non-array ignore list', async () => {
    await expect(resolveSiteConfig({
      deadLinks: { ignore: 'nope' as never },
    })).rejects.toThrow('deadLinks.ignore must be an array')
  })

  it('rejects an ignore entry that is not a string, RegExp, or function', async () => {
    await expect(resolveSiteConfig({
      deadLinks: { ignore: [1 as never] },
    })).rejects.toThrow('deadLinks.ignore[0] must be a string, regular expression, or function, got number')
  })
})
