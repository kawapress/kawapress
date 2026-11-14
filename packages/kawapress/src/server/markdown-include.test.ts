import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { buildSite } from './build'

describe('markdown includes and code snippets in a build', () => {
  it('renders included parts in the page, the LLMS copy and the search index', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-include-'))

    try {
      await mkdir(join(root, 'parts'), { recursive: true })
      await Promise.all([
        writeFile(join(root, 'kawapress.config.ts'), `
import { nagi } from 'kawapress/nagi'

export default nagi({ title: 'KawaPress', srcExclude: ['parts/**'] })
`),
        writeFile(join(root, 'index.md'), `---
layout: home
---
`),
        writeFile(join(root, 'guide.md'), `# Guide

<!--@include: ./parts/shared.md-->

<<< ./parts/demo.ts#setup
`),
        writeFile(join(root, 'parts/shared.md'), `---
title: Not a page
---

Shared paragraph about lanterns.
`),
        writeFile(join(root, 'parts/demo.ts'), `// #region setup
const lantern = 'lit'
// #endregion setup
export {}
`),
      ])

      await buildSite(root)

      const page = await readFile(join(root, 'dist/guide.html'), 'utf8')
      expect(page).toContain('Shared paragraph about lanterns.')
      expect(page).toContain('lantern')
      expect(page).not.toContain('#region')

      const llms = await readFile(join(root, 'dist/guide.md'), 'utf8')
      expect(llms).toContain('Shared paragraph about lanterns.')
      expect(llms).toContain('const lantern = \'lit\'')

      // The serialized MiniSearch index, the only script with a document count,
      // holds the words of the included part.
      const assets = await readdir(join(root, 'dist/assets'))
      const scripts = await Promise.all(assets
        .filter(asset => asset.endsWith('.js'))
        .map(asset => readFile(join(root, 'dist/assets', asset), 'utf8')))
      const searchIndex = scripts.find(script => script.includes('documentCount'))
      expect(searchIndex).toContain('lanterns')

      // srcExclude keeps the shared part from becoming a page of its own.
      await expect(readFile(join(root, 'dist/parts/shared.html'), 'utf8')).rejects.toThrow()
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  })
})
