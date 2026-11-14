import { describe, expect, it } from 'vitest'
import {
  collectSocialLinks,
  nagiSocialIconsPlugin,
  resolveSocialIcons,
  SOCIAL_ICONS_MODULE_ID,
} from './social-icons-plugin'

describe('nagi social links', () => {
  it('collects the links of the site and of every locale', () => {
    expect(collectSocialLinks({
      themeConfig: { socialLinks: [{ icon: 'github', link: 'https://github.com/a/b' }] },
      locales: {
        root: { label: 'English' },
        zh: { label: '简体中文', themeConfig: { socialLinks: [{ icon: { svg: '<svg/>' }, link: 'https://x.test' }] } },
      },
    })).toEqual([
      { icon: 'github', link: 'https://github.com/a/b' },
      { icon: { svg: '<svg/>' }, link: 'https://x.test' },
    ])
  })

  it('points a site that still writes githubUrl at socialLinks', () => {
    expect(() => collectSocialLinks({ themeConfig: { githubUrl: 'https://github.com/a/b' } }))
      .toThrow('themeConfig.githubUrl was replaced by socialLinks')
  })

  it.each([
    [{ socialLinks: {} }, 'themeConfig.socialLinks must be an array'],
    [{ socialLinks: [{ link: 'https://a.test' }] }, 'themeConfig.socialLinks[0].icon must be'],
    [{ socialLinks: [{ icon: { svg: '' }, link: 'https://a.test' }] }, 'themeConfig.socialLinks[0].icon must be'],
    [{ socialLinks: [{ icon: 'github' }] }, 'themeConfig.socialLinks[0].link must be'],
    [{ socialLinks: [{ icon: 'github', link: 'https://a.test', ariaLabel: 1 }] }, 'themeConfig.socialLinks[0].ariaLabel must be'],
  ])('rejects %j', (themeConfig, message) => {
    expect(() => collectSocialLinks({ themeConfig })).toThrow(message)
  })

  it('turns each Simple Icons name into a standalone SVG, aliases included', async () => {
    const icons = await resolveSocialIcons([
      { icon: 'github', link: 'https://github.com/a/b' },
      // An alias of `amazonwebservices` in the icon set.
      { icon: 'amazonaws', link: 'https://aws.test' },
      { icon: { svg: '<svg/>' }, link: 'https://x.test' },
    ])

    expect(Object.keys(icons)).toEqual(['amazonaws', 'github'])
    expect(icons.github).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 24 24" aria-hidden="true"><path /)
  })

  it('names the unknown icon', async () => {
    await expect(resolveSocialIcons([{ icon: 'not-an-icon', link: 'https://a.test' }]))
      .rejects
      .toThrow('socialLinks icon "not-an-icon" is not a Simple Icons name')
  })

  it('publishes only the icons the site uses', async () => {
    const plugin = nagiSocialIconsPlugin({
      themeConfig: { socialLinks: [{ icon: 'discord', link: 'https://discord.test' }] },
    })
    const resolveId = plugin.resolveId as (id: string) => string | undefined
    const load = plugin.load as (id: string) => Promise<string | undefined>
    const source = await load(resolveId(SOCIAL_ICONS_MODULE_ID)!) ?? ''

    const module = await import(`data:text/javascript,${encodeURIComponent(source)}`) as {
      socialIcons: Record<string, string>
    }
    expect(Object.keys(module.socialIcons)).toEqual(['discord'])
  })
})
