import type { KawaPressPlugin, PageData } from 'kawapress'
import type { LastUpdatedPluginOptions } from './types'
import { resolve } from 'node:path'
import process from 'node:process'
import { consola } from 'consola'
import { definePlugin } from 'kawapress'
import { readGitLastUpdated } from 'kawapress/generator'
import { createEditLink, toRepositoryPath, validateEditLinkPattern } from './edit-link'
import { readGitTopLevel } from './git'
import { PLUGIN_NAME } from './name'
import { createRuntimeOptions, lastUpdatedOptionsPlugin } from './options-module'

const WARNING_LABEL = 'KawaPress Last Updated'

export function lastUpdatedPlugin(
  options: LastUpdatedPluginOptions = {},
): KawaPressPlugin {
  const runtimeOptions = createRuntimeOptions(options)
  const editLinkPattern = options.editLink
    ? validateEditLinkPattern(options.editLink.pattern)
    : undefined

  let root = process.cwd()
  let timestamps: Promise<Map<string, number>> | undefined
  let repositoryRoot: Promise<string | undefined> | undefined
  let warnedMissingRepository = false

  /** One `git log` per build or dev session, keyed by absolute source file. */
  const loadTimestamps = (): Promise<Map<string, number>> => {
    timestamps ??= readGitLastUpdated(root, {
      label: WARNING_LABEL,
      skipped: 'the last updated time',
    }).then(dates => dates ?? new Map())
    return timestamps
  }

  const loadRepositoryRoot = (): Promise<string | undefined> => {
    repositoryRoot ??= readGitTopLevel(root)
    return repositoryRoot
  }

  return definePlugin({
    name: PLUGIN_NAME,
    setup(api) {
      api.configResolved((site) => {
        root = site.root
      })
      api.vite((config) => {
        config.plugins ??= []
        config.plugins.push(lastUpdatedOptionsPlugin(runtimeOptions))
      })

      api.pageData(async (pageData, { file }) => {
        if (file === undefined) {
          applyPluginPageFrontmatter(pageData)
          return
        }
        const sourceFile = resolve(file)
        const dates = await loadTimestamps()
        const lastUpdated = dates.get(sourceFile)
        if (lastUpdated !== undefined) {
          pageData.lastUpdated = lastUpdated
        }

        if (!editLinkPattern) {
          return
        }
        const topLevel = await loadRepositoryRoot()
        if (!topLevel) {
          if (!warnedMissingRepository) {
            warnedMissingRepository = true
            consola.warn(`${WARNING_LABEL}: the site is not inside a git repository, the edit link is skipped.`)
          }
          return
        }
        const repositoryPath = toRepositoryPath(sourceFile, topLevel)
        if (repositoryPath) {
          pageData.editLink = createEditLink(editLinkPattern, repositoryPath)
        }
      })
    },
  })
}

/**
 * A plugin page has no source file in git, so it has no date and no edit link
 * unless its frontmatter gives them: `lastUpdated` as a date string and
 * `editLink` as the absolute URL of its source.
 */
function applyPluginPageFrontmatter(pageData: PageData): void {
  const { lastUpdated, editLink } = pageData.frontmatter
  if (typeof lastUpdated === 'string') {
    const time = Date.parse(lastUpdated)
    if (Number.isNaN(time)) {
      throw new TypeError(`${WARNING_LABEL}: the frontmatter lastUpdated of ${pageData.path} is not a valid date: ${JSON.stringify(lastUpdated)}.`)
    }
    pageData.lastUpdated = time
  }
  if (typeof editLink === 'string' && editLink.length > 0) {
    pageData.editLink = editLink
  }
}

export default lastUpdatedPlugin
