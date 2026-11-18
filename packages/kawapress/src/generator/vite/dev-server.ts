import type { Server } from 'node:http'
import type {
  InlineConfig,
  RunnableDevEnvironment,
  ViteDevServer,
  WsOptions,
} from 'vite'
import type { GeneratorSiteConfig } from '../config'
import { createServer, isRunnableDevEnvironment } from 'vite'
import { createBaseViteConfig } from './config'
import { entryServerPath } from './entries'

export interface KawapressViteServer {
  vite: ViteDevServer
  serverEnv: RunnableDevEnvironment
}

export interface CreateViteServerOptions {
  hmr?: boolean
  httpServer?: Server
}

export async function createViteServer(
  root: string,
  siteConfig: GeneratorSiteConfig,
  options: CreateViteServerOptions = {},
): Promise<KawapressViteServer> {
  const baseConfig = createBaseViteConfig(root, siteConfig)
  const viteConfig: InlineConfig = {
    ...baseConfig,
    environments: {
      ssr: {
        consumer: 'server',
        build: {
          rollupOptions: { input: entryServerPath },
        },
      },
    },
    server: {
      // Keeps the site's own `vite.server` options (port, proxy, fs, ...).
      ...baseConfig.server,
      hmr: options.hmr ?? baseConfig.server?.hmr,
      middlewareMode: options.httpServer
        ? { server: options.httpServer }
        : true,
      ws: resolveWsOptions(baseConfig.server?.ws, options.httpServer),
    },
  }
  await siteConfig.pluginRunner.runVite(viteConfig)

  const vite = await createServer(viteConfig)
  const serverEnv = vite.environments.ssr
  if (!isRunnableDevEnvironment(serverEnv)) {
    throw new Error('KawaPress: server environment is not runnable')
  }

  return { vite, serverEnv }
}

/**
 * In middleware mode Vite opens its own WebSocket server on 24678, so a second
 * `kawapress dev` would serve pages without HMR. Share the HTTP server instead,
 * unless the site configured its own WebSocket server, port or turned it off.
 */
function resolveWsOptions(
  ws: WsOptions | false | undefined,
  httpServer: Server | undefined,
): WsOptions | false | undefined {
  if (!httpServer || ws === false || ws?.server || ws?.port) {
    return ws
  }
  return { ...ws, server: httpServer }
}
