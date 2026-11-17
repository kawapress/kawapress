import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildSite } from './build'

describe('frontmatter', () => {
  it('renders a page title and description in the document head', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-frontmatter-'))

    try {
      await Promise.all([
        writeFile(join(root, 'kawapress.config.ts'), `
import { nagi } from 'kawapress/nagi'

export default nagi({ title: 'KawaPress' })
`),
        writeFile(join(root, 'index.md'), `---
title: Frontmatter
titleTemplate: '%s · Guide'
description: A short page description.
layout: page
---
`),
      ])

      await buildSite(root)

      const page = await readFile(join(root, 'dist/index.html'), 'utf8')
      expect(page.match(/<title>/g)).toHaveLength(1)
      expect(page).toContain('<title>Frontmatter · Guide</title>')
      expect(page.match(/<meta name="description"/g)).toHaveLength(1)
      expect(page).toContain(
        '<meta name="description" content="A short page description.">',
      )
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  it('falls back to the locale and site description for pages without one', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-frontmatter-'))

    try {
      await mkdir(join(root, 'zh'))
      await Promise.all([
        writeFile(join(root, 'kawapress.config.ts'), `
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'KawaPress',
  description: 'Site description.',
  locales: {
    root: { label: 'English', lang: 'en' },
    zh: { label: '简体中文', lang: 'zh-CN', description: '站点描述。' },
  },
})
`),
        writeFile(join(root, 'index.md'), '---\nlayout: page\n---\n'),
        writeFile(join(root, 'own.md'), '---\nlayout: page\ndescription: Own description.\n---\n'),
        writeFile(join(root, 'zh/index.md'), '---\nlayout: page\n---\n'),
      ])

      await buildSite(root)

      const [site, own, zh] = await Promise.all([
        readFile(join(root, 'dist/index.html'), 'utf8'),
        readFile(join(root, 'dist/own.html'), 'utf8'),
        readFile(join(root, 'dist/zh.html'), 'utf8'),
      ])
      for (const page of [site, own, zh])
        expect(page.match(/<meta name="description"/g)).toHaveLength(1)
      expect(site).toContain('<meta name="description" content="Site description.">')
      expect(own).toContain('<meta name="description" content="Own description.">')
      expect(zh).toContain('<meta name="description" content="站点描述。">')
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  it('uses the logo favicon only until a head declares its own icon', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-frontmatter-'))

    try {
      await mkdir(join(root, 'zh'))
      await Promise.all([
        writeFile(join(root, 'kawapress.config.ts'), `
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'KawaPress',
  locales: {
    root: { label: 'English', lang: 'en' },
    zh: { label: '简体中文', lang: 'zh-CN', head: [['link', { rel: 'icon', href: '/zh.svg' }]] },
  },
  themeConfig: { logo: '/logo.svg' },
})
`),
        writeFile(join(root, 'index.md'), '---\nlayout: page\n---\n'),
        writeFile(join(root, 'own.md'), '---\nlayout: page\nhead: [[link, { rel: icon, href: /own.svg }]]\n---\n'),
        writeFile(join(root, 'zh/index.md'), '---\nlayout: page\n---\n'),
      ])

      await buildSite(root)

      const icons = async (file: string): Promise<string[]> =>
        (await readFile(join(root, 'dist', file), 'utf8')).match(/<link[^>]*rel="icon"[^>]*>/g) ?? []
      expect(await icons('index.html')).toEqual(['<link id="nagi-favicon" rel="icon" href="/logo.svg">'])
      expect(await icons('own.html')).toEqual(['<link rel="icon" href="/own.svg">'])
      expect(await icons('zh.html')).toEqual(['<link rel="icon" href="/zh.svg">'])
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  it('applies Nagi page presentation controls to the rendered layout', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-frontmatter-'))

    try {
      await Promise.all([
        writeFile(join(root, 'kawapress.config.ts'), `
import { nagi } from 'kawapress/nagi'

export default nagi({ title: 'KawaPress' })
`),
        writeFile(join(root, 'index.md'), `---
layout: page
navbar: false
footer: false
pageClass: plain-page
---
# Plain page
`),
        writeFile(join(root, 'guide.md'), `---
navbar: false
sidebar: false
aside: false
outline: false
pageClass: focused-doc
---
# Guide

## First section
`),
      ])

      await buildSite(root)

      const page = await readFile(join(root, 'dist/index.html'), 'utf8')
      expect(page).toContain('class="nagi nagi--page plain-page"')
      expect(page).not.toContain('nagi-nav-bar')
      expect(page).not.toContain('nagi-footer')

      const guide = await readFile(join(root, 'dist/guide.html'), 'utf8')
      expect(guide).toContain('class="nagi nagi--doc focused-doc"')
      expect(guide).not.toContain('nagi-nav-bar')
      expect(guide).not.toContain('nagi-sidebar')
      expect(guide).not.toContain('nagi-outline')
      expect(guide).not.toContain('nagi-doc-toolbar__menu')
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  })
})
