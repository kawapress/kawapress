import type { ResolvedSiteConfig } from '../core/site'
import { resolve } from 'node:path'
import { MarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import { definePlugin } from '../api/plugin'
import { setupGeneratorPlugins } from './plugin-host'

describe('configResolved', () => {
  it('reads the final config after every config() hook, with defaults applied', async () => {
    const seen: ResolvedSiteConfig[] = []
    const reader = definePlugin({
      name: 'reader',
      setup(api) {
        api.configResolved((site) => {
          seen.push(site)
        })
      },
    })
    // Registered after the reader, but its config() still runs before any configResolved().
    const writer = definePlugin({
      name: 'writer',
      setup(api) {
        api.config((config) => {
          config.base = '/docs'
          config.description = 'From a plugin'
        })
      },
    })

    const host = await setupGeneratorPlugins({ plugins: [reader, writer] }, { root: 'site' })

    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({
      root: resolve('site'),
      title: 'KawaPress',
      description: 'From a plugin',
      base: '/docs/',
      srcDir: '.',
      srcExclude: [],
      publicDir: 'public',
      head: [],
      themeConfig: {},
      locales: { root: { label: 'English', lang: 'en' } },
    })
    expect(Object.isFrozen(seen[0])).toBe(true)
    expect(host.site).toEqual(seen[0])
  })
})

describe('setupGeneratorPlugins', () => {
  it('runs the remaining hooks of the plugins it set up', async () => {
    const host = await setupGeneratorPlugins({
      locales: { root: { label: '简体中文', lang: 'zh-CN' } },
      plugins: [definePlugin({
        name: 'lang-attribute',
        setup(api) {
          let lang = ''
          api.configResolved((site) => {
            lang = site.locales.root.lang ?? ''
          })
          api.markdown((markdown) => {
            markdown.core.ruler.push('lang', (state) => {
              state.env.lang = lang
            })
          })
        },
      })],
    })
    const markdown = new MarkdownExit()
    await host.runMarkdown(markdown)
    const env: Record<string, unknown> = {}
    markdown.render('text', env)

    expect(env.lang).toBe('zh-CN')
    expect(host.site).not.toHaveProperty('pluginRunner')
  })
})
