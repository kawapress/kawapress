import type { UserConfig } from 'vite'
import { describe, expect, it } from 'vitest'
import { SSG_MD_ENVIRONMENT } from './constants'
import { inheritSsrResolve } from './ssr-resolve'

describe('inheritSsrResolve', () => {
  it('bundles what the SSR build bundles', () => {
    const config: UserConfig = {
      ssr: {
        noExternal: ['vue', /^@vue\//],
        resolve: { conditions: ['module'] },
      },
      environments: { [SSG_MD_ENVIRONMENT]: { consumer: 'server' } },
    }

    inheritSsrResolve(config)

    expect(config.environments?.[SSG_MD_ENVIRONMENT]?.resolve).toEqual({
      noExternal: ['vue', /^@vue\//],
      conditions: ['module'],
    })
  })

  it('keeps resolve options the environment sets itself', () => {
    const config: UserConfig = {
      ssr: { noExternal: ['vue'] },
      environments: {
        [SSG_MD_ENVIRONMENT]: { resolve: { noExternal: true } },
      },
    }

    inheritSsrResolve(config)

    expect(config.environments?.[SSG_MD_ENVIRONMENT]?.resolve?.noExternal).toBe(true)
  })

  it('leaves a config without the Markdown environment alone', () => {
    const config: UserConfig = { ssr: { noExternal: ['vue'] } }

    inheritSsrResolve(config)

    expect(config.environments).toBeUndefined()
  })
})
