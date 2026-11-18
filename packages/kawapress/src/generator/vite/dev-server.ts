import type { Server } from 'node:http'
import type {
  InlineConfig,
  RunnableDevEnvironment,
  ViteDevServer,
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
