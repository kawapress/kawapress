// @vitest-environment happy-dom

import type { NagiSocialLink } from '../social-links'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import SocialLinks from './SocialLinks.vue'

const testState = vi.hoisted(() => ({ socialLinks: undefined as NagiSocialLink[] | undefined }))

vi.mock('../social-icons', () => ({
  socialIcons: { github: '<svg viewBox="0 0 24 24"><path d="M0"/></svg>' },
}))

vi.mock('../composables/useNagiThemeConfig', async () => {
  const { computed } = await import('vue')
  return { useNagiThemeConfig: () => computed(() => ({ socialLinks: testState.socialLinks })) }
})

afterEach(() => {
  testState.socialLinks = undefined
})

describe('social links', () => {
  it('renders nothing without links', async () => {
    expect(await render()).toBe('<!--[--><!--]-->')
  })

  it('renders named and inline icons with an accessible name', async () => {
    testState.socialLinks = [
      { icon: 'github', link: 'https://github.com/a/b' },
      { icon: { svg: '<svg><circle r="1"/></svg>' }, link: 'https://x.test', ariaLabel: 'Status' },
    ]
    document.body.innerHTML = await render()

    const links = [...document.querySelectorAll<HTMLAnchorElement>('a.nagi-social-link')]
    expect(links.map(link => [link.href, link.getAttribute('aria-label')])).toEqual([
      ['https://github.com/a/b', 'github'],
      ['https://x.test/', 'Status'],
    ])
    expect(links[0]!.querySelector('path')).not.toBeNull()
    expect(links[1]!.querySelector('circle')).not.toBeNull()
    expect(links.every(link => link.target === '_blank' && link.rel === 'noreferrer')).toBe(true)
  })
})

function render(): Promise<string> {
  return renderToString(createSSRApp({ render: () => h(SocialLinks) }))
}
