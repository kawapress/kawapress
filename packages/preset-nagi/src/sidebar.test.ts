import type { SidebarPage } from './sidebar'
import { describe, expect, it } from 'vitest'
import {
  createSidebar,
  defineLocalizedSidebars,
  findSidebarNavigation,
  hasActiveSidebarLink,
  isSidebarLinkActive,
  resolveConfiguredSidebar,
} from './sidebar'

function page(title: string): SidebarPage {
  return { title }
}

describe('nagi sidebar metadata', () => {
  it('localizes directories and orders listed pages', () => {
    const pages = {
      '/guide/getting-started': page('快速开始'),
      '/guide/what-is-kawapress': page('KawaPress 是什么？'),
      '/guide/appendix': page('附录'),
    }

    expect(createSidebar(pages, {
      meta: {
        '/': [{ type: 'dir', name: 'guide', label: '指南' }],
        '/guide': ['what-is-kawapress', 'getting-started'],
      },
    })).toEqual([{
      text: '指南',
      items: [
        { text: 'KawaPress 是什么？', link: '/guide/what-is-kawapress' },
        { text: '快速开始', link: '/guide/getting-started' },
        { text: '附录', link: '/guide/appendix' },
      ],
    }])
  })

  it('builds locale sidebars from one route structure', () => {
    const sidebars = defineLocalizedSidebars({
      locales: {
        zhCN: '',
        en: '/en',
      },
      items: [{
        text: { zhCN: '指南', en: 'Guide' },
        items: [{
          text: { zhCN: '快速开始', en: 'Getting Started' },
          link: '/guide/getting-started',
        }],
      }],
    })

    expect(sidebars.zhCN[0]?.items?.[0]?.link)
      .toBe('/guide/getting-started')
    expect(sidebars.en[0]).toMatchObject({
      text: 'Guide',
      items: [{
        text: 'Getting Started',
        link: '/en/guide/getting-started',
      }],
    })
  })

  it('keeps only doc layout pages in the automatic sidebar', () => {
    const pages = {
      '/': { title: 'Home', layout: 'home' },
      '/about': { title: 'About', layout: 'page' },
      '/frame': { title: 'Frame', layout: false as const },
      '/custom': { title: 'Custom', layout: 'component-docs' },
      '/guide/start': { title: 'Start' },
    }

    expect(createSidebar(pages)).toEqual([{
      text: 'Guide',
      items: [{ text: 'Start', link: '/guide/start' }],
    }])
  })

  it('uses the sidebar order for previous and next page navigation', () => {
    const items = [{
      text: 'Guide',
      items: [
        { text: 'Introduction', link: '/guide/introduction' },
        { text: 'Getting Started', link: '/guide/getting-started' },
      ],
    }, {
      text: 'Reference',
      items: [
        { text: 'API', link: '/reference/api' },
        { text: 'External', link: 'https://example.com' },
      ],
    }]

    expect(findSidebarNavigation(items, '/guide/getting-started/')).toEqual({
      previous: { text: 'Introduction', link: '/guide/introduction' },
      next: { text: 'API', link: '/reference/api' },
    })
  })

  it('resolves VitePress-style sidebar config by the longest path prefix', () => {
    const sidebar = resolveConfiguredSidebar({
      '/guide/': {
        base: '/guide/',
        items: [{
          text: 'Guide',
          items: [{ text: 'Start', link: 'start' }],
        }],
      },
      '/guide/advanced/': [
        { text: 'Advanced', link: '/guide/advanced/' },
      ],
    }, '/guide/start')

    expect(sidebar).toEqual([{
      text: 'Guide',
      items: [{
        text: 'Start',
        link: '/guide/start',
      }],
    }])
    expect(resolveConfiguredSidebar({
      '/guide/': [],
    }, '/reference/api')).toBeUndefined()
  })

  it('keeps the collapsed flag through locales, section bases and _meta.json', () => {
    const [localized] = defineLocalizedSidebars({
      locales: { en: '/en' },
      items: [{ text: 'Guide', collapsed: true, items: [{ text: 'Start', link: '/start' }] }],
    }).en
    expect(localized).toEqual({ text: 'Guide', collapsed: true, items: [{ text: 'Start', link: '/en/start' }] })

    expect(resolveConfiguredSidebar({
      '/guide/': { base: '/guide/', items: [{ text: 'Guide', collapsed: false, items: [{ text: 'Start', link: 'start' }] }] },
    }, '/guide/start')).toEqual([{ text: 'Guide', collapsed: false, items: [{ text: 'Start', link: '/guide/start' }] }])

    expect(createSidebar({ '/guide/start': page('Start') }, {
      meta: { '/': [{ type: 'dir', name: 'guide', collapsed: true }] },
    })).toEqual([{ text: 'Guide', collapsed: true, items: [{ text: 'Start', link: '/guide/start' }] }])
  })

  it('finds the current page anywhere below a group', () => {
    const group = {
      text: 'Guide',
      items: [{ text: 'Deep', items: [{ text: 'Routing', link: '/guide/routing' }] }],
    }
    expect(hasActiveSidebarLink(group, '/guide/routing/')).toBe(true)
    expect(hasActiveSidebarLink(group, '/guide/markdown')).toBe(false)
  })

  it('matches the active link by route path only', () => {
    expect(isSidebarLinkActive('/guide/routing', '/guide/routing')).toBe(true)
    // Query, hash and a trailing slash do not change which page a link points at.
    expect(isSidebarLinkActive('/guide/routing#top', '/guide/routing')).toBe(true)
    expect(isSidebarLinkActive('/guide/routing?tab=1', '/guide/routing')).toBe(true)
    expect(isSidebarLinkActive('/guide/routing', '/guide/routing/')).toBe(true)
    expect(isSidebarLinkActive('/', '/')).toBe(true)
    expect(isSidebarLinkActive('/guide/routing', '/guide/routing/nested')).toBe(false)
    expect(isSidebarLinkActive('/guide/routing', '/guide')).toBe(false)
    // Only page routes can be active, never external or hash-only links.
    expect(isSidebarLinkActive('https://example.com/guide/routing', '/guide/routing')).toBe(false)
    expect(isSidebarLinkActive('#top', '/guide/routing')).toBe(false)
  })

  it('uses locale-specific metadata below the locale root', () => {
    const pages = {
      '/en/guide/getting-started': page('Getting Started'),
    }

    expect(createSidebar(pages, {
      base: '/en',
      meta: {
        '/en': [{ type: 'dir', name: 'guide', label: 'Guide' }],
      },
    })[0]?.text).toBe('Guide')
  })
})
