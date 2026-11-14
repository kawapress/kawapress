import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { buildSite } from './build'

describe('rewrites in a build', () => {
  it('serves a page at its rewritten route and resolves links from there', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-rewrites-'))

    try {
      await mkdir(join(root, 'packages/core/src'), { recursive: true })
      await mkdir(join(root, 'packages/theme/src'), { recursive: true })
      await Promise.all([
        writeFile(join(root, 'kawapress.config.ts'), `
import { nagi } from 'kawapress/nagi'

export default nagi({
  title: 'KawaPress',
  rewrites: { 'packages/:pkg/src/:page*': ':pkg/:page*' },
})
`),
        writeFile(join(root, 'index.md'), `---
layout: home
---
`),
        writeFile(join(root, 'packages/core/src/intro.md'), `# Core intro

Read the [theme guide](../theme/guide.md).
`),
        writeFile(join(root, 'packages/theme/src/guide.md'), '# Theme guide\n'),
      ])

      await buildSite(root)

      const intro = await readFile(join(root, 'dist/core/intro.html'), 'utf8')
      expect(intro).toContain('Core intro')
      // The link is written against the rewritten path, the way VitePress reads it.
      expect(intro).toContain('href="/theme/guide"')
      // The automatic sidebar lists the pages by their new routes.
      expect(intro).toContain('href="/core/intro"')

      expect(await readFile(join(root, 'dist/theme/guide.html'), 'utf8')).toContain('Theme guide')
      // The Markdown copy for LLMs sits at the rewritten path too, so the link
      // it keeps as written still reaches the theme guide.
      expect(await readFile(join(root, 'dist/core/intro.md'), 'utf8'))
        .toContain('[theme guide](../theme/guide.md)')
      expect(await readFile(join(root, 'dist/theme/guide.md'), 'utf8')).toContain('Theme guide')
      await expect(readFile(join(root, 'dist/packages/core/src/intro.html'), 'utf8')).rejects.toThrow()
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  })
})
