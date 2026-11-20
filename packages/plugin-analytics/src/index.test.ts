import type { UserConfig } from 'vite'
import process from 'node:process'
import { setupGeneratorPlugins } from 'kawapress/generator'
import { afterEach, describe, expect, it } from 'vitest'
import { analyticsPlugin, isBuildCommand } from './index'
import { ANALYTICS_OPTIONS_MODULE_ID } from './vite-plugin'

interface ExecutableOptionsPlugin {
  name: string
  resolveId: (id: string) => string | undefined
  load: (id: string) => string | undefined
}

const ALL_SERVICES = {
  google: { id: 'G-TEST123' },
  plausible: { domain: 'example.com' },
  umami: { websiteId: 'umami-id', src: 'https://umami.example.com/script.js' },
  cloudflare: { token: 'cf-token' },
}

const originalArgv = process.argv

afterEach(() => {
  process.argv = originalArgv
})

describe('analytics plugin head', () => {
  it('writes every service into the site head on build', async () => {
    stubArgv(['build'])
    const { head } = (await setupGeneratorPlugins({ plugins: [analyticsPlugin(ALL_SERVICES)] })).site

    expect(head).toEqual([
      ['script', { async: true, src: 'https://www.googletagmanager.com/gtag/js?id=G-TEST123' }],
      ['script', {}, expect.stringContaining('send_page_view:false')],
      ['script', { 'defer': true, 'data-domain': 'example.com', 'src': 'https://plausible.io/js/script.js' }],
      ['script', { 'defer': true, 'src': 'https://umami.example.com/script.js', 'data-website-id': 'umami-id' }],
      ['script', {
        'defer': true,
        'src': 'https://static.cloudflareinsights.com/beacon.min.js',
        'data-cf-beacon': '{"token":"cf-token","spa":true}',
      }],
    ])
  })

  it('configures gtag for the one page view the runtime sends', async () => {
    stubArgv(['build'])
    const { head } = (await setupGeneratorPlugins({
      plugins: [analyticsPlugin({ google: { id: 'G-TEST123' } })],
    })).site

    expect(head[1][2]).toContain(`gtag('config',"G-TEST123",{send_page_view:false})`)
  })

  it('keeps the head the site already has', async () => {
    stubArgv(['build'])
    const { head } = (await setupGeneratorPlugins({
      head: [['meta', { name: 'a', content: 'b' }]],
      plugins: [analyticsPlugin({ plausible: { domain: 'example.com' } })],
    })).site

    expect(head).toHaveLength(2)
    expect(head[0]).toEqual(['meta', { name: 'a', content: 'b' }])
  })

  it('injects nothing during dev by default', async () => {
    stubArgv(['dev'])
    const { head } = (await setupGeneratorPlugins({ plugins: [analyticsPlugin(ALL_SERVICES)] })).site

    expect(head).toEqual([])
  })

  it('injects during dev when asked to', async () => {
    stubArgv(['dev'])
    const { head } = (await setupGeneratorPlugins({
      plugins: [analyticsPlugin({ ...ALL_SERVICES, dev: true })],
    })).site

    expect(head).toHaveLength(5)
  })

  it('reports a wrong option when the factory runs', () => {
    expect(() => analyticsPlugin({})).toThrow(/at least one/)
    expect(() => analyticsPlugin({ google: { id: 'UA-1-1' } })).toThrow(/Universal Analytics/)
  })
})

describe('analytics plugin runtime options', () => {
  it('tells the runtime whether Google is configured', async () => {
    expect(await publishedOptions(ALL_SERVICES)).toEqual({ google: true })
    expect(await publishedOptions({ plausible: { domain: 'example.com' } })).toEqual({ google: false })
  })
})

describe('isBuildCommand', () => {
  it('only recognises the build command', () => {
    expect(isBuildCommand(['node', 'kawapress', 'build'])).toBe(true)
    expect(isBuildCommand(['node', 'kawapress', 'build', '--debug-hydration'])).toBe(true)
    expect(isBuildCommand(['node', 'kawapress', 'dev'])).toBe(false)
    expect(isBuildCommand(['node', 'kawapress', 'preview'])).toBe(false)
    expect(isBuildCommand(['node', '/path/build/cli.js'])).toBe(false)
  })
})

function stubArgv(args: string[]): void {
  process.argv = ['node', 'kawapress', ...args]
}

async function publishedOptions(options: Parameters<typeof analyticsPlugin>[0]): Promise<unknown> {
  const host = await setupGeneratorPlugins({ plugins: [analyticsPlugin(options)] })
  const config: UserConfig = {}
  await host.runVite(config)

  const plugin = config.plugins?.find(
    (candidate): candidate is ExecutableOptionsPlugin => (
      typeof candidate === 'object' && candidate !== null && 'name' in candidate
      && candidate.name === 'kawapress:analytics-options'
    ),
  )
  if (!plugin) {
    throw new Error('Expected the analytics options plugin.')
  }
  const resolvedId = plugin.resolveId(ANALYTICS_OPTIONS_MODULE_ID)
  const source = resolvedId ? plugin.load(resolvedId) : undefined
  if (!source?.startsWith('export default ')) {
    throw new Error('Expected the analytics options module to load JSON.')
  }
  return JSON.parse(source.slice('export default '.length))
}
