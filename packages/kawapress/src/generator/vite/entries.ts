import { fileURLToPath } from 'node:url'

export const entryServerPath = fileURLToPath(new URL('../../client/entries/entry-server.ts', import.meta.url))
export const entryClientPath = fileURLToPath(new URL('../../client/entries/entry-client.ts', import.meta.url))

/**
 * Output directory and file name of the built server entry. The `.mjs`
 * extension keeps it an ES module whatever the `type` of the site's
 * `package.json` is.
 */
export const SERVER_OUT_DIR = 'dist/.server'
export const SERVER_ENTRY_FILE = 'entry-server.mjs'
