import { performance } from 'node:perf_hooks'
import process from 'node:process'
import { defineCommand, runMain } from 'citty'
import { version } from '../package.json'
import { parsePort } from './cli/parse-port'
import {
  ensureProductionNodeEnv,
  warnAboutReplacedNodeEnv,
} from './server/build-node-env'

const dev = defineCommand({
  meta: { name: 'dev', description: 'Start the dev server' },
  args: {
    port: {
      type: 'string',
      description: 'Port to listen on (default: vite.server.port or 5173)',
    },
    strictPort: {
      type: 'boolean',
      description: 'Exit if the port is already in use instead of trying the next one',
    },
  },
  async run({ args }) {
    const startedAt = performance.now()
    const [{ logDevServerReady }, { createDevServer }] = await Promise.all([
      import('./cli/dev-output'),
      import('./server/dev'),
    ])
    const server = await createDevServer(process.cwd(), {
      port: args.port === undefined ? undefined : parsePort(args.port),
      strictPort: args.strictPort,
    })
    logDevServerReady({
      durationMs: performance.now() - startedAt,
      port: server.port,
    })
  },
})

const build = defineCommand({
  meta: { name: 'build', description: 'Build the static site' },
  async run() {
    // Pinned before `./server/build` is imported: that import chain reaches
    // `@vue/compiler-core` through Vite's Vue plugin, and Vue picks its
    // development or production compiler the moment the module is required.
    // A later fix-up could no longer strip template comments from the output.
    warnAboutReplacedNodeEnv(ensureProductionNodeEnv(process.env))
    const { buildSite } = await import('./server/build')
    await buildSite(process.cwd())
  },
})

const preview = defineCommand({
  meta: { name: 'preview', description: 'Preview the built site' },
  args: {
    port: {
      type: 'string',
      description: 'Port to listen on',
      default: '4173',
    },
  },
  async run({ args }) {
    const { previewSite } = await import('./server/preview')
    await previewSite(process.cwd(), { port: parsePort(args.port) })
  },
})

export const main = defineCommand({
  meta: {
    name: 'kawapress',
    version,
    description: 'Static site generator powered by Vue & Vite.',
  },
  subCommands: {
    dev,
    build,
    preview,
  },
})

runMain(main)
