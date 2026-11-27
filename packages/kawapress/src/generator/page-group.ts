import type { PluginPageContent, PluginPagesContext, PluginPagesGenerator, PluginPagesSource } from '../api/plugin-pages'
import type { FileTemplate, RouteTemplate } from './page-template'
import type { PluginPageRecord } from './plugin-pages'
import type { TrackedFiles } from './tracked-files'
import { readFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { markdownPagePathToRoutePath } from '../core/markdown-route'
import { findDataLoaderFiles } from './data/glob'
import { mergeFrontmatter } from './page-frontmatter'
import { fillRouteTemplate, parseFileTemplate, parseRouteTemplate } from './page-template'
import { describePageGroup, generatePluginSourcePath, routeToPagePath } from './plugin-pages'
import { createFileTracker } from './tracked-files'

/** One `api.pages(route, source)` call of a plugin. */
export interface PageRegistration {
  pluginName: string
  route: string
  source: PluginPagesSource
}

/** What one execution of a group produced and read. */
export interface PageGroupRun {
  records: PluginPageRecord[]
  /** What the execution read, also when it failed. */
  dependencies: TrackedFiles
  /** Why the execution failed; `records` is empty then. */
  error?: unknown
}

export interface PageGroup {
  plugin: string
  template: string
  /** `pages("/x/[a]") of plugin "p"`, for messages. */
  label: string
  run: (command: PluginPagesContext['command']) => Promise<PageGroupRun>
}

/**
 * Checks a `pages()` call and returns the group it declares. A group is
 * executed on its own, so its dependencies are its own too.
 */
export function createPageGroup(registration: PageRegistration, root: string): PageGroup {
  const { pluginName: plugin, route, source } = registration
  const label = describePageGroup(plugin, String(route))
  const template = parseRouteTemplate(route, label)
  if (typeof source !== 'string' && typeof source !== 'function') {
    throw new TypeError(`KawaPress: ${label}: the second argument must be a file template or a function, got ${typeof source}.`)
  }
  const fileTemplate = typeof source === 'string' ? parseFileTemplate(source, root, template, label) : undefined

  const context = { plugin, template, label }
  return {
    plugin,
    template: route,
    label,
    async run(command) {
      const recorder = createFileTracker(root)
      try {
        const records = typeof source === 'string'
          ? await expandFileTemplate(context, fileTemplate!, recorder)
          : await expandGenerator(context, source, { command, read: recorder.read, glob: recorder.glob })
        return { records, dependencies: recorder.snapshot() }
      }
      catch (error) {
        return { records: [], dependencies: recorder.snapshot(), error }
      }
    },
  }
}

interface GroupContext {
  plugin: string
  template: RouteTemplate
  label: string
}

async function expandFileTemplate(
  group: GroupContext,
  fileTemplate: FileTemplate,
  recorder: ReturnType<typeof createFileTracker>,
): Promise<PluginPageRecord[]> {
  const files = await findDataLoaderFiles([fileTemplate.glob])
  recorder.addGlob({
    patterns: [fileTemplate.glob],
    matched: new Set(files),
    watchDirectories: [fileTemplate.baseDirectory],
  })
  const records: PluginPageRecord[] = []
  for (const file of files) {
    const params = fileTemplate.match(file)
    if (!params) {
      continue
    }
    recorder.addFile(file)
    const route = fillRouteTemplate(group.template, params, `KawaPress: ${group.label}: the file ${JSON.stringify(file)}`)
    records.push(toRecord(group, route, { markdown: await readFile(file, 'utf8') }, dirname(file)))
  }
  if (records.length === 0) {
    throw new Error(`KawaPress: ${group.label}: the file template ${JSON.stringify(fileTemplate.source)} matches no file.`)
  }
  return records
}

async function expandGenerator(
  group: GroupContext,
  generate: PluginPagesGenerator<string>,
  context: PluginPagesContext,
): Promise<PluginPageRecord[]> {
  let result: unknown
  try {
    result = await generate(context)
  }
  catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause)
    throw new Error(`KawaPress: ${group.label}: the function failed. ${detail}`, { cause })
  }

  if (group.template.params.length === 0) {
    const content = typeof result === 'string' ? { markdown: result } : result
    return [toRecord(group, group.template.source, readContent(content, `KawaPress: ${group.label}`, 'a string or an object'))]
  }
  if (!Array.isArray(result)) {
    throw new TypeError(
      `KawaPress: ${group.label}: the function must return an array with one item per page, got ${describe(result)}.`,
    )
  }
  return result.map((item: unknown, index) => {
    const where = `KawaPress: ${group.label}: item [${index}]`
    const content = readContent(item, where, 'an object')
    const route = fillRouteTemplate(group.template, item as Record<string, unknown>, where)
    return toRecord(group, route, content)
  })
}

function readContent(value: unknown, where: string, expected: string): PluginPageContent {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${where} must be ${expected} with a markdown string, got ${describe(value)}.`)
  }
  const { markdown, frontmatter } = value as Partial<PluginPageContent>
  if (typeof markdown !== 'string') {
    throw new TypeError(`${where} must have a markdown string, got ${describe(markdown)}.`)
  }
  if (frontmatter !== undefined && (typeof frontmatter !== 'object' || frontmatter === null || Array.isArray(frontmatter))) {
    throw new TypeError(`${where} must have a frontmatter object, got ${describe(frontmatter)}.`)
  }
  return { markdown, frontmatter }
}

function toRecord(
  group: GroupContext,
  route: string,
  content: PluginPageContent,
  sourceDirectory?: string,
): PluginPageRecord {
  const pagePath = routeToPagePath(route)
  return {
    plugin: group.plugin,
    template: group.template.source,
    markdown: mergeFrontmatter(content.markdown, content.frontmatter),
    ...(sourceDirectory === undefined ? {} : { sourceDirectory }),
    sourcePath: generatePluginSourcePath(group.plugin, pagePath),
    pagePath,
    routePath: markdownPagePathToRoutePath(pagePath),
  }
}

function describe(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  if (value === undefined) {
    return 'nothing'
  }
  return Array.isArray(value) ? 'an array' : typeof value
}
