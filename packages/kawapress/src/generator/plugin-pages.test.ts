import type { KawaPressPlugin } from '../api/plugin'
import type { PluginPagesContext } from '../api/plugin-pages'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { definePlugin } from '../api/plugin'
import { setupGeneratorPlugins } from './plugin-host'
import { listSitePages } from './site-pages'

let directory: string
let root: string

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'kawapress-plugin-pages-'))
  root = join(directory, 'site')
  await mkdir(root, { recursive: true })
})

afterEach(async () => {
  await rm(directory, { force: true, recursive: true })
})

async function write(path: string, content: string): Promise<void> {
  const file = join(directory, path)
  await mkdir(join(file, '..'), { recursive: true })
  await writeFile(file, content)
}

type Register = (api: Parameters<KawaPressPlugin['setup']>[0]) => void

/** Sets up one plugin named `@demo/plugin` and lists the pages it adds as `[sourcePath, routePath, source]`. */
async function listPluginPages(register: Register): Promise<Array<[string, string, string]>> {
  const host = await setupPlugin(register)
  const pages = (await listSitePages(host.site)).filter(page => page.origin === 'plugin')
  return Promise.all(pages.map(async page => [page.sourcePath, page.routePath, await page.readSource()]))
}

function setupPlugin(register: Register) {
  return setupGeneratorPlugins({
    plugins: [definePlugin({ name: '@demo/plugin', setup: register })],
  }, { root })
}

describe('file templates', () => {
  it('makes one page per file, with the file as source and the params in the route', async () => {
    await write('packages/b/README.md', '# B\n')
    await write('packages/a/README.md', '# A\n')
    await write('packages/a/src/README.md', '# Not a package\n')

    const pages = await listPluginPages((api) => {
      api.pages('/packages/[name]', '../packages/[name]/README.md')
    })

    expect(pages).toEqual([
      ['@demo/plugin/packages/a.md', '/packages/a', '# A\n'],
      ['@demo/plugin/packages/b.md', '/packages/b', '# B\n'],
    ])
  })

  it('lets a rest parameter take several segments, and index files become directory routes', async () => {
    await write('notes/a.md', '# A\n')
    await write('notes/guide/index.md', '# Guide\n')
    await write('notes/guide/setup.md', '# Setup\n')

    const pages = await listPluginPages((api) => {
      api.pages('/notes/[...slug]', '../notes/[...slug].md')
    })

    expect(pages.map(([sourcePath, routePath]) => [sourcePath, routePath])).toEqual([
      ['@demo/plugin/notes/a.md', '/notes/a'],
      ['@demo/plugin/notes/guide/index.md', '/notes/guide'],
      ['@demo/plugin/notes/guide/setup.md', '/notes/guide/setup'],
    ])
  })

  it('maps a file template without parameters to one page', async () => {
    await write('LICENSE.md', '# License\n')

    const pages = await listPluginPages((api) => {
      api.pages('/license', '../LICENSE.md')
    })

    expect(pages).toEqual([['@demo/plugin/license.md', '/license', '# License\n']])
  })

  it('names the plugin and the template when no file matches', async () => {
    const host = await setupPlugin((api) => {
      api.pages('/packages/[name]', '../packages/[name]/README.md')
    })

    await expect(listSitePages(host.site)).rejects.toThrow(
      /KawaPress: pages\("\/packages\/\[name\]"\) of plugin "@demo\/plugin": the file template "..\/packages\/\[name\]\/README.md" matches no file/,
    )
  })

  it('rejects params that differ from the route when the plugin registers them', async () => {
    await expect(setupPlugin((api) => {
      api.pages('/packages/[name]', '../packages/[id]/README.md' as never)
    })).rejects.toThrow(
      'pages("/packages/[name]") of plugin "@demo/plugin": the route has the parameters [name] but the file template "../packages/[id]/README.md" has [id]',
    )
  })
})

describe('generator functions', () => {
  it('turns every item into a page and reads files through read() and glob()', async () => {
    await write('data/versions.txt', '2\n1\n')
    await write('data/a.json', '{}')
    await write('data/b.json', '{}')
    let seen: PluginPagesContext | undefined

    const pages = await listPluginPages((api) => {
      api.pages('/changelog/[version]', async (context) => {
        seen = context
        const versions = (await context.read('../data/versions.txt')).trim().split('\n')
        return versions.map(version => ({ version, markdown: `# v${version}\n` }))
      })
      api.pages('/files/[...path]', async ({ glob }) => (
        (await glob('../data/*.json')).map(file => ({ path: file.split('/').pop()!, markdown: '#\n' }))
      ))
    })

    expect(pages.map(([sourcePath, routePath]) => [sourcePath, routePath])).toEqual([
      ['@demo/plugin/changelog/2.md', '/changelog/2'],
      ['@demo/plugin/changelog/1.md', '/changelog/1'],
      ['@demo/plugin/files/a.json.md', '/files/a.json'],
      ['@demo/plugin/files/b.json.md', '/files/b.json'],
    ])
    expect(seen?.command).toBe('build')
  })

  it('makes a single page from a string or an object, also at a directory route', async () => {
    const pages = await listPluginPages((api) => {
      api.pages('/about', () => '# About\n')
      api.pages('/changelog/', () => ({ markdown: '# Changelog\n', frontmatter: { title: 'News' } }))
    })

    expect(pages).toEqual([
      ['@demo/plugin/about.md', '/about', '# About\n'],
      ['@demo/plugin/changelog/index.md', '/changelog', '---\ntitle: News\n---\n# Changelog\n'],
    ])
  })

  it('merges frontmatter into the Markdown: its keys win, the Markdown\'s other keys stay', async () => {
    const pages = await listPluginPages((api) => {
      api.pages('/yaml/[id]', () => [{
        id: 'a',
        markdown: '---\ntitle: Old\norder: 3\n---\n# Body\n',
        frontmatter: { title: 'New', lastUpdated: '2025-01-02' },
      }])
      api.pages('/json/[id]', () => [{
        id: 'a',
        markdown: '{\n  "title": "Old",\n  "order": 3\n}\n# Body\n',
        frontmatter: { title: 'New' },
      }])
      api.pages('/plain/[id]', () => [{ id: 'a', markdown: '# Body\n' }])
    })

    const [yaml, json, plain] = pages.map(page => page[2])
    expect(yaml).toContain('title: New')
    expect(yaml).toContain('order: 3')
    expect(yaml).toContain(`lastUpdated: '2025-01-02'`)
    expect(yaml).not.toContain('Old')
    expect(yaml.endsWith('# Body\n')).toBe(true)
    expect(json).toContain('title: New')
    expect(json).toContain('order: 3')
    expect(plain).toBe('# Body\n')
  })

  it.each([
    ['an item without a parameter', () => [{ markdown: '#\n' }], 'item [0]: the parameter "id" must be a non-empty string without "/", got nothing'],
    ['an item with an empty value', () => [{ id: 'a', markdown: '#\n' }, { id: '', markdown: '#\n' }], 'item [1]: the parameter "id" must be a non-empty string without "/", got ""'],
    ['an item with a slash in a [x] value', () => [{ id: 'a/b', markdown: '#\n' }], 'item [0]: the parameter "id" must be a non-empty string without "/", got "a/b"'],
    ['an item without markdown', () => [{ id: 'a' }], 'item [0] must have a markdown string, got nothing'],
    ['an item that is not an object', () => ['x'], 'item [0] must be an object with a markdown string, got string'],
    ['a frontmatter that is not an object', () => [{ id: 'a', markdown: '#\n', frontmatter: 'x' }], 'item [0] must have a frontmatter object, got string'],
    ['a result that is not an array', () => ({ id: 'a', markdown: '#\n' }), 'must return an array with one item per page, got object'],
    ['two items on one route', () => [{ id: 'a', markdown: '#\n' }, { id: 'a', markdown: '#\n' }], 'produces the route "/p/a" more than once'],
  ])('rejects %s', async (_name, generate, message) => {
    const host = await setupPlugin((api) => {
      api.pages('/p/[id]', generate as never)
    })

    const error = await listSitePages(host.site).catch((caught: Error) => caught)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('KawaPress: pages("/p/[id]") of plugin "@demo/plugin"')
    expect((error as Error).message).toContain(message)
  })

  it('rejects a [...x] value with a leading or trailing slash', async () => {
    const host = await setupPlugin((api) => {
      api.pages('/p/[...path]', () => [{ path: 'a/', markdown: '#\n' }])
    })

    await expect(listSitePages(host.site)).rejects.toThrow('item [0]: the parameter "path" must be one or more path segments')
  })

  it('names the plugin and the template when the function throws', async () => {
    const host = await setupPlugin((api) => {
      api.pages('/p/[id]', () => {
        throw new Error('boom')
      })
    })

    await expect(listSitePages(host.site)).rejects.toThrow('KawaPress: pages("/p/[id]") of plugin "@demo/plugin": the function failed. boom')
  })

  it('names the plugin and the template when read() cannot read the file', async () => {
    const host = await setupPlugin((api) => {
      api.pages('/p/[id]', async ({ read }) => [{ id: 'a', markdown: await read('missing.md') }])
    })

    await expect(listSitePages(host.site)).rejects.toThrow(/pages\("\/p\/\[id\]"\) of plugin "@demo\/plugin": the function failed\. ENOENT/)
  })

  it('rejects an array for a route without parameters', async () => {
    const host = await setupPlugin((api) => {
      api.pages('/p', (() => [{ markdown: '#\n' }]) as never)
    })

    await expect(listSitePages(host.site)).rejects.toThrow('pages("/p") of plugin "@demo/plugin" must be a string or an object with a markdown string, got an array')
  })
})

describe('route templates', () => {
  it.each([
    ['a route without a leading slash', 'p/[id]', 'the route must be a string that starts with a single "/", got "p/[id]"'],
    ['a parameter that shares a segment with text', '/p/v[id]', 'must take a whole segment'],
    ['a duplicate parameter', '/p/[id]/[id]', 'the parameter "id" is used more than once'],
  ])('rejects %s when the plugin registers it', async (_name, route, message) => {
    await expect(setupPlugin((api) => {
      api.pages(route as never, (() => []) as never)
    })).rejects.toThrow(message)
  })

  it('types the item from the route literal', () => {
    setupPlugin((api) => {
      api.pages('/team/[id]', () => [{ id: 'a', markdown: '' }])
      api.pages('/docs/[...slug]', () => [{ slug: 'a/b', markdown: '' }])
      api.pages('/one', () => 'text')
      // @ts-expect-error `id` is missing
      api.pages('/team/[id]', () => [{ markdown: '' }])
      // @ts-expect-error a route without parameters returns one page
      api.pages('/one', () => [{ markdown: '' }])
    }).catch(() => {})
  })
})
