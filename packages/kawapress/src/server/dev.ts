import { createServer as createHttpServer } from 'node:http'
import { consola } from 'consola'
import { createReloadableDevEnvironment } from './dev-environment'
import { listen } from './listen'

export interface CreateDevServerOptions {
  hmr?: boolean
  /** Overrides `vite.server.port` from the site config. */
  port?: number
  /** Overrides `vite.server.strictPort` from the site config. */
  strictPort?: boolean
}

export interface KawapressDevServer {
  close: () => Promise<void>
  port: number
}

export async function createDevServer(
  root: string,
  options: CreateDevServerOptions = {},
): Promise<KawapressDevServer> {
  const server = createHttpServer()
  const environment = await createReloadableDevEnvironment(root, server, {
    hmr: options.hmr,
  })
  server.on('request', environment.dispatchRequest)

  let port: number
  try {
    port = await listen(server, {
      host: environment.serverOptions.host,
      port: options.port ?? environment.serverOptions.port,
      strictPort: options.strictPort ?? environment.serverOptions.strictPort,
      command: 'kawapress dev',
      onPortInUse: port => consola.info(
        `KawaPress: port ${port} is in use, trying another one...`,
      ),
    })
  }
  catch (error) {
    await environment.close()
    throw error
  }

  return {
    port,
    async close() {
      await environment.close()
      await new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve())
      })
    },
  }
}
