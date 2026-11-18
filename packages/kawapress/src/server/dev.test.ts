import type { ChildProcess } from 'node:child_process'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { KawapressDevServer } from './dev'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDevServer } from './dev'

const kawapressPackageDirectory = fileURLToPath(new URL('../..', import.meta.url))
const kawapressBin = join(kawapressPackageDirectory, 'bin/kawapress.mjs')

let siteDirectory: string
const cleanups: Array<() => Promise<void> | void> = []

beforeEach(async () => {
  siteDirectory = await mkdtemp(join(tmpdir(), 'kawapress-dev-'))
})

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    await cleanup()
  }
  await rm(siteDirectory, { force: true, recursive: true })
})

async function createSite(viteServer?: { port?: number, strictPort?: boolean }): Promise<void> {
  await writeFile(join(siteDirectory, 'package.json'), JSON.stringify({
    name: 'dev-port-test',
    private: true,
    type: 'module',
  }))
  await writeFile(join(siteDirectory, 'kawapress.config.ts'), `export default ${JSON.stringify({
    title: 'Dev Port Test',
    ...viteServer && { vite: { server: viteServer } },
  })}\n`)
  await writeFile(join(siteDirectory, 'index.md'), '# Dev Port Test\n')
  await mkdir(join(siteDirectory, 'node_modules'), { recursive: true })
  await symlink(
    kawapressPackageDirectory,
    join(siteDirectory, 'node_modules/kawapress'),
    'dir',
  )
}

async function startDevServer(options: Parameters<typeof createDevServer>[1]): Promise<KawapressDevServer> {
  const server = await createDevServer(siteDirectory, { hmr: false, ...options })
  cleanups.push(() => server.close())
  return server
}

/** Finds a port that is free right now. */
async function freePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>(resolve => server.listen(0, resolve))
  const { port } = server.address() as AddressInfo
  await new Promise<void>(resolve => server.close(() => resolve()))
  return port
}

/** Keeps a port taken until the test ends. */
async function occupyPort(): Promise<number> {
  const server: Server = createServer()
  await new Promise<void>(resolve => server.listen(0, resolve))
  cleanups.push(() => new Promise<void>(resolve => server.close(() => resolve())))
  return (server.address() as AddressInfo).port
}

describe('createDevServer port', () => {
  it('uses vite.server.port from the site config', async () => {
    const port = await freePort()
    await createSite({ port })
    const server = await startDevServer({})
    expect(server.port).toBe(port)
  })

  it('lets the port option override vite.server.port', async () => {
    const configPort = await occupyPort()
    const port = await freePort()
    await createSite({ port: configPort, strictPort: true })
    const server = await startDevServer({ port })
    expect(server.port).toBe(port)
  })

  it('fails fast when strictPort is set and the port is taken', async () => {
    const taken = await occupyPort()
    await createSite()
    await expect(startDevServer({ port: taken, strictPort: true })).rejects.toThrow(
      `KawaPress: port ${taken} is already in use.`,
    )
  })

  it('honours vite.server.strictPort from the site config', async () => {
    const taken = await occupyPort()
    await createSite({ port: taken, strictPort: true })
    await expect(startDevServer({})).rejects.toThrow(
      `KawaPress: port ${taken} is already in use.`,
    )
  })

  it('tries the next port when the port is taken without strictPort', async () => {
    const taken = await occupyPort()
    await createSite()
    const server = await startDevServer({ port: taken })
    expect(server.port).toBeGreaterThan(taken)
  })
})

describe('kawapress dev CLI', () => {
  function runDev(args: string[]): { child: ChildProcess, output: () => string, exited: Promise<number | null> } {
    const child = spawn(process.execPath, [kawapressBin, 'dev', ...args], {
      cwd: siteDirectory,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    const collect = (chunk: string): void => {
      output += chunk
    }
    child.stdout!.setEncoding('utf8').on('data', collect)
    child.stderr!.setEncoding('utf8').on('data', collect)
    const exited = new Promise<number | null>(resolve => child.on('exit', resolve))
    cleanups.push(async () => {
      if (child.exitCode === null) {
        child.kill()
        await exited
      }
    })
    return { child, output: () => output, exited }
  }

  it('serves on --port', async () => {
    const port = await freePort()
    await createSite()
    const dev = runDev(['--port', String(port), '--strictPort'])
    await expect.poll(dev.output, { timeout: 30_000 })
      .toContain(`http://localhost:${port}/`)
    const response = await fetch(`http://localhost:${port}/`)
    expect(response.status).toBe(200)
  })

  it('exits when --strictPort is set and --port is taken', async () => {
    const taken = await occupyPort()
    await createSite()
    const dev = runDev(['--port', String(taken), '--strictPort'])
    expect(await dev.exited).not.toBe(0)
    expect(dev.output()).toContain(`KawaPress: port ${taken} is already in use.`)
  })
})
