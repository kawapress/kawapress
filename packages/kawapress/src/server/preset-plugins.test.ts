import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildSite } from './build'

const SHIKI_PLUGIN = resolve(import.meta.dirname, '../../../plugin-shiki/src/index.ts')

describe('preset plugins', () => {
  it('replaces a nagi plugin with a user plugin of the same name', async () => {
    const root = await mkdtemp(join(process.cwd(), 'docs/.kawapress-preset-plugins-'))

    try {
      await Promise.all([
        writeFile(join(root, 'kawapress.config.ts'), `
import { nagi } from 'kawapress/nagi'
import { shikiPlugin } from ${JSON.stringify(SHIKI_PLUGIN)}

const yaml = {
  name: 'yaml',
  scopeName: 'source.yaml',
  patterns: [{ match: '\\\\w+', name: 'keyword.control' }],
  repository: {},
}

export default nagi({
  title: 'KawaPress',
  plugins: [shikiPlugin({ theme: 'github-light', languages: [yaml] })],
})
`),
        writeFile(join(root, 'index.md'), '```yaml\nready\n```\n'),
      ])

      await buildSite(root)

      const page = await readFile(join(root, 'dist/index.html'), 'utf8')
      expect(page).toMatch(/<span style="color:#D73A49;?">ready<\/span>/)
      // The preset's dual-theme Shiki plugin no longer runs.
      expect(page).not.toContain('shiki-themes')
    }
    finally {
      await rm(root, { force: true, recursive: true })
    }
  })
})
