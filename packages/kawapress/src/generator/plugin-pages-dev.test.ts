import type { PagesChange } from './site-pages'
import { mkdir, mkdtemp, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { consola } from 'consola'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { definePlugin } from '../api/plugin'
import { resolveSiteConfig } from './config'
import { listSitePages } from './site-pages'

let directory: string
let root: string

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'kawapress-plugin-pages-dev-'))
  root = join(directory, 'site')
  await mkdir(root, { recursive: true })
})

afterEach(async () => {
  vi.restoreAllMocks()
  await rm(directory, { force: true, recursive: true })
})

async function write(path: string, content: string): Promise<string> {
  const file = join(directory, path)
  await mkdir(join(file, '..'), { recursive: true })
  await writeFile(file, content)
  return file
}

type Event = 'add' | 'change' | 'unlink'

function createWatcher() {
  const listeners = new Map<Event, Array<(file: string) => void>>()
  const added: string[] = []
  return {
    added,
    add: (paths: string[]) => added.push(...paths),
    on: (event: Event, listener: (file: string) => void) => {
      listeners.set(event, [...(listeners.get(event) ?? []), listener])
    },
    emit(event: Event, file: string) {
      listeners.get(event)?.forEach(listener => listener(file))
    },
  }
}

/** A dev server with two groups: a changelog read from one file, and notes matched by a file template. */
async function startDev() {
  const runs = { changelog: 0, notes: 0 }
  const versionsFile = await write('data/versions.txt', '1\n')
  await write('notes/a.md', '# A\n')
  const site = await resolveSiteConfig({
    plugins: [definePlugin({
      name: 'dev',
      setup(api) {
        api.pages('/changelog/[version]', async ({ read }) => {
          runs.changelog++
          const versions = (await read('../data/versions.txt')).trim().split('\n')
          return versions.map(version => ({ version, markdown: `# v${version}\n` }))
        })
        api.pages('/notes/[...slug]', '../notes/[...slug].md')
        api.pages('/news/', async ({ glob }) => {
          const files = await glob('../news/*.md')
          return `# ${files.length} news\n`
        })
      },
    })],
  }, { root, command: 'dev' })
  const changes: PagesChange[] = []
  site.pageRegistry.subscribe(change => changes.push(change))
  const watcher = createWatcher()
  site.pageRegistry.watchPluginPages(watcher)
  const pages = async () => (await listSitePages(site.resolvedSite)).filter(page => page.origin === 'plugin')
  const routes = async () => (await pages()).map(page => page.routePath)
  await pages()
  return { site, watcher, runs, versionsFile, changes, routes, pages, notesFile: join(directory, 'notes/a.md') }
}

/** Waits until the queued file events have been handled. */
async function settled(changes: PagesChange[], count: number): Promise<void> {
  await vi.waitFor(() => expect(changes).toHaveLength(count))
}

describe('plugin pages in the dev server', () => {
  it('watches the files and patterns each group recorded', async () => {
    const { watcher, versionsFile, notesFile } = await startDev()

    expect(watcher.added).toContain(versionsFile)
    expect(watcher.added).toContain(notesFile)
    expect(watcher.added).toContain(join(directory, 'notes'))
    expect(watcher.added).toContain(join(directory, 'news'))
  })

  it('runs only the group that read a changed file again, and hot-updates when only content changed', async () => {
    const { watcher, runs, versionsFile, changes, pages } = await startDev()
    expect(runs.changelog).toBe(1)

    watcher.emit('change', versionsFile)

    await vi.waitFor(() => expect(runs.changelog).toBe(2))
    // The group ran again but produced the same pages, so nobody is told.
    expect(changes).toEqual([])
    expect((await pages()).map(page => page.routePath)).toContain('/changelog/1')
  })

  it('reloads the browser when the set of pages changes and replaces what the group recorded', async () => {
    const { watcher, versionsFile, changes, routes } = await startDev()

    await writeFile(versionsFile, '2\n1\n')
    watcher.emit('change', versionsFile)
    await settled(changes, 1)
    expect(changes[0]).toEqual({ setChanged: true, changedSources: [] })
    expect(await routes()).toEqual(['/changelog/2', '/changelog/1', '/notes/a', '/news'])
  })

  it('updates only the edited page when a file template page changes', async () => {
    const { watcher, runs, notesFile, changes, pages } = await startDev()

    await writeFile(notesFile, '# A changed\n')
    watcher.emit('change', notesFile)
    await settled(changes, 1)

    expect(runs.changelog).toBe(1)
    expect(changes[0]).toEqual({ setChanged: false, changedSources: ['dev/notes/a.md'] })
    const page = (await pages()).find(item => item.routePath === '/notes/a')!
    expect(await page.readSource()).toBe('# A changed\n')
  })

  it('adds and removes pages when files appear or go that fit the file template', async () => {
    const { watcher, changes, routes } = await startDev()

    const added = await write('notes/b/index.md', '# B\n')
    watcher.emit('add', added)
    await settled(changes, 1)
    expect(changes[0]?.setChanged).toBe(true)
    expect(await routes()).toContain('/notes/b')

    await unlink(added)
    watcher.emit('unlink', added)
    await settled(changes, 2)
    expect(changes[1]?.setChanged).toBe(true)
    expect(await routes()).not.toContain('/notes/b')
  })

  it('re-runs a group when a file appears that fits a glob() pattern, and ignores other files', async () => {
    const { watcher, changes, pages } = await startDev()

    const other = await write('elsewhere/x.md', '# X\n')
    watcher.emit('add', other)
    const news = await write('news/today.md', '# Today\n')
    watcher.emit('add', news)
    await settled(changes, 1)

    expect(changes[0]).toEqual({ setChanged: false, changedSources: ['dev/news/index.md'] })
    const page = (await pages()).find(item => item.routePath === '/news')!
    expect(await page.readSource()).toBe('# 1 news\n')
  })

  it('logs the error and keeps the previous pages of a group that fails, leaving the other groups alone', async () => {
    const error = vi.spyOn(consola, 'error').mockImplementation(() => {})
    const { watcher, versionsFile, changes, routes } = await startDev()

    await unlink(versionsFile)
    watcher.emit('unlink', versionsFile)
    await vi.waitFor(() => expect(error).toHaveBeenCalledTimes(1))

    expect(error.mock.calls[0]![0]).toContain('pages("/changelog/[version]") of plugin "dev" failed; its previous pages stay.')
    expect(changes).toEqual([])
    expect(await routes()).toEqual(['/changelog/1', '/notes/a', '/news'])

    // The file comes back: the group works again, and the missing file was still watched.
    await writeFile(versionsFile, '3\n')
    watcher.emit('add', versionsFile)
    await settled(changes, 1)
    expect(await routes()).toEqual(['/changelog/3', '/notes/a', '/news'])
  })

  it('keeps the previous pages when a re-run makes a route clash with a Markdown file', async () => {
    const error = vi.spyOn(consola, 'error').mockImplementation(() => {})
    await write('site/notes/guide.md', '# Guide\n')
    const { watcher, changes, routes } = await startDev()
    const added = await write('notes/guide.md', '# Notes guide\n')

    watcher.emit('add', added)
    await vi.waitFor(() => expect(error).toHaveBeenCalledTimes(1))

    expect(changes).toEqual([])
    expect(await routes()).toEqual(['/changelog/1', '/notes/a', '/news'])
    expect(error.mock.calls[0]![0]).toContain('the previous pages stay')
    expect(String(error.mock.calls[0]![1])).toContain('"/notes/guide.md" (a Markdown file) and pages("/notes/[...slug]") of plugin "dev" both produce the route "/notes/guide"')
  })

  it('does not watch in a build', async () => {
    const site = await resolveSiteConfig({
      plugins: [definePlugin({ name: 'build', setup: api => api.pages('/a', () => '#\n') })],
    }, { root })

    expect(await listSitePages(site.resolvedSite)).toHaveLength(1)
  })
})
