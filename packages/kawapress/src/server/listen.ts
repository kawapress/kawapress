import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

const MAX_PORT = 65535

export interface ListenOptions {
  port: number
  /** Fail instead of trying the next port when `port` is taken. */
  strictPort: boolean
  /** Command shown in the error so users know which flag to change. */
  command: string
  onPortInUse?: (port: number) => void
}

/**
 * Listens like Vite does: a taken port moves on to the next one unless
 * `strictPort` is set, in which case the taken port is an error.
 */
export async function listen(
  server: Server,
  options: ListenOptions,
): Promise<number> {
  for (let port = options.port; port <= MAX_PORT; port++) {
    const error = await tryListen(server, port)
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

function tryListen(
  server: Server,
  port: number,
): Promise<NodeJS.ErrnoException | undefined> {
  return new Promise((resolve) => {
    const settle = (error?: NodeJS.ErrnoException): void => {
      server.off('error', settle)
      server.off('listening', settle)
      resolve(error)
    }
    server.once('error', settle)
    server.once('listening', settle)
    server.listen(port)
  })
}
