import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createServer } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { listen } from './listen'

const servers: Server[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>((resolve) => {
    server.close(() => resolve())
  })))
})

function track(server: Server): Server {
  servers.push(server)
  return server
}

/** Holds a free port so the server under test finds it taken. */
async function occupyPort(): Promise<number> {
  const blocker = track(createServer())
  await new Promise<void>(resolve => blocker.listen(0, resolve))
  return (blocker.address() as AddressInfo).port
}

describe('listen', () => {
  it('listens on the requested port', async () => {
    const server = track(createServer())
    const port = await listen(server, { port: 0, strictPort: true, command: 'kawapress dev' })
    expect(port).toBeGreaterThan(0)
    expect((server.address() as AddressInfo).port).toBe(port)
  })

  it('fails on a taken port when strictPort is set', async () => {
    const taken = await occupyPort()
    const server = track(createServer())
    await expect(listen(server, {
      port: taken,
      strictPort: true,
      command: 'kawapress dev',
    })).rejects.toThrow(
      `KawaPress: port ${taken} is already in use. Free it or choose another one with \`kawapress dev --port <number>\`.`,
    )
    expect(server.listening).toBe(false)
  })

  it('moves on to the next port when strictPort is not set', async () => {
    const taken = await occupyPort()
    const server = track(createServer())
    const onPortInUse = vi.fn()
    const port = await listen(server, {
      port: taken,
      strictPort: false,
      command: 'kawapress dev',
      onPortInUse,
    })
    expect(port).toBeGreaterThan(taken)
    expect(onPortInUse).toHaveBeenCalledWith(taken)
  })
})
