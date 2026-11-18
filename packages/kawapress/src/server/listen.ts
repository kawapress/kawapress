import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createServer } from 'node:net'

const MAX_PORT = 65535

/**
 * Addresses a browser may reach for `localhost:port`. On macOS a listener on
 * one of them does not stop another process from binding the others, so a
 * single bind can succeed while `localhost` still reaches someone else.
 */
const LOOPBACK_PROBE_HOSTS = [undefined, '127.0.0.1', '::1'] as const

/** Errors that mean the probed address does not exist on this machine. */
const UNAVAILABLE_ADDRESS_CODES = new Set(['EADDRNOTAVAIL', 'EAFNOSUPPORT'])

export interface ListenOptions {
  /**
   * `vite.server.host`: unset or `false` listens on `localhost`, `true` on all
   * addresses, a string on that address.
   */
  host?: string | boolean
  port: number
  /** Fail instead of trying the next port when `port` is taken. */
  strictPort: boolean
  /** Command shown in the error so users know which flag to change. */
  command: string
  onPortInUse?: (port: number) => void
}

/**
 * Listens like Vite does: a taken port moves on to the next one unless
 * `strictPort` is set, in which case the taken port is an error. A port counts
 * as taken when anything holds it on the listen address, the wildcard address
 * or either loopback address.
 */
export async function listen(
  server: Server,
  options: ListenOptions,
): Promise<number> {
  const host = resolveListenHost(options.host)
  for (let port = options.port; port <= MAX_PORT; port++) {
    const error = port === 0 || await isPortFree(port, host)
      ? await tryListen(server, port, host)
      : addressInUse(port)
    if (!error) {
      return (server.address() as AddressInfo).port
    }
    if (error.code !== 'EADDRINUSE') {
      throw error
    }
    if (options.strictPort || port === 0) {
      throw new Error(
        `KawaPress: port ${port} is already in use. Free it or choose another one with \`${options.command} --port <number>\`.`,
      )
    }
    options.onPortInUse?.(port)
  }
  throw new Error(
    `KawaPress: no available port found between ${options.port} and ${MAX_PORT}.`,
  )
}

/** Same mapping as Vite's `resolveHostname`. */
export function resolveListenHost(host: string | boolean | undefined): string | undefined {
  if (host === undefined || host === false) {
    return 'localhost'
  }
  return host === true ? undefined : host
}

async function isPortFree(port: number, host: string | undefined): Promise<boolean> {
  const hosts = new Set<string | undefined>([host, ...LOOPBACK_PROBE_HOSTS])
  for (const probeHost of hosts) {
    const probe = createServer()
    const error = await tryListen(probe, port, probeHost)
    if (!error) {
      await new Promise<void>(resolve => probe.close(() => resolve()))
      continue
    }
    if (error.code === 'EADDRINUSE') {
      return false
    }
    if (!UNAVAILABLE_ADDRESS_CODES.has(error.code ?? '')) {
      throw error
    }
  }
  return true
}

function addressInUse(port: number): NodeJS.ErrnoException {
  return Object.assign(new Error(`port ${port} is in use`), { code: 'EADDRINUSE' })
}

function tryListen(
  server: Server | ReturnType<typeof createServer>,
  port: number,
  host: string | undefined,
): Promise<NodeJS.ErrnoException | undefined> {
  return new Promise((resolve) => {
    const settle = (error?: NodeJS.ErrnoException): void => {
      server.off('error', settle)
      server.off('listening', settle)
      resolve(error)
    }
    server.once('error', settle)
    server.once('listening', settle)
    server.listen(port, host)
  })
}
