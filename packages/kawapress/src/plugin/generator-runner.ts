import type { MarkdownExit } from 'markdown-exit'
import type { UserConfig } from 'vite'
import type {
  BuildArtifactsContext,
  GeneratorPluginAPI,
  KawaPressPlugin,
  PageBuildArtifact,
  PageDataContext,
} from '../api/plugin'
import type { PageData } from '../core/extension-points'
import type { ResolvedSiteConfig, SiteConfig } from '../core/site'
import { assertPageDataSerializable } from '../core/site'
import {
  createPluginHandlerRegistry,
  runPluginSetup,
} from './execution'

export interface GeneratorPluginRunner {
  runConfig: (config: SiteConfig) => Promise<void>
  runConfigResolved: (config: ResolvedSiteConfig) => Promise<void>
  runMarkdown: (markdown: MarkdownExit) => Promise<void>
  runPageData: (
    pageData: PageData,
    context: Readonly<PageDataContext>,
  ) => Promise<void>
  runPageArtifact: (
    artifact: Readonly<PageBuildArtifact>,
  ) => Promise<void>
  runVite: (config: UserConfig) => Promise<void>
  runBuildArtifacts: (
    context: Omit<BuildArtifactsContext, 'pages'>,
  ) => Promise<void>
  getPageArtifacts: () => readonly PageBuildArtifact[]
}

export async function createGeneratorPluginRunner(
  plugins: KawaPressPlugin[],
): Promise<GeneratorPluginRunner> {
  const configHandlers = createPluginHandlerRegistry<SiteConfig>('generator', 'config')
  const configResolvedHandlers = createPluginHandlerRegistry<ResolvedSiteConfig>('generator', 'configResolved')
  const markdownHandlers = createPluginHandlerRegistry<MarkdownExit>('generator', 'markdown')
  const pageDataHandlers = createPluginHandlerRegistry<PageData, Readonly<PageDataContext>>('generator', 'pageData', {
    afterEachHandle: assertPageDataSerializable,
  })
  const pageArtifactHandlers = createPluginHandlerRegistry<Readonly<PageBuildArtifact>>(
    'generator',
    'pageArtifact',
  )
  const viteHandlers = createPluginHandlerRegistry<UserConfig>('generator', 'vite')
  const buildArtifactHandlers = createPluginHandlerRegistry<BuildArtifactsContext>(
    'generator',
    'buildArtifacts',
  )
  const pageArtifacts = new Map<string, PageBuildArtifact>()
  assertUniquePluginNames(plugins)

  const getPageArtifacts = (): readonly PageBuildArtifact[] => (
    [...pageArtifacts.values()].sort((left, right) => (
      left.sourcePath.localeCompare(right.sourcePath)
    ))
  )

  for (const plugin of plugins) {
    const api: GeneratorPluginAPI = {
      config: handler => configHandlers.add(plugin.name, handler),
      configResolved: handler => configResolvedHandlers.add(plugin.name, handler),
      markdown: handler => markdownHandlers.add(plugin.name, handler),
      pageData: handler => pageDataHandlers.add(plugin.name, handler),
      pageArtifact: handler => pageArtifactHandlers.add(plugin.name, handler),
      vite: handler => viteHandlers.add(plugin.name, handler),
      buildArtifacts: handler => buildArtifactHandlers.add(plugin.name, handler),
    }

    await runPluginSetup(
      'generator',
      plugin.name,
      () => plugin.setup(api),
    )
  }

  return {
    runConfig: configHandlers.run,
    runConfigResolved: configResolvedHandlers.run,
    runMarkdown: markdownHandlers.run,
    runPageData: pageDataHandlers.run,
    async runPageArtifact(artifact) {
      pageArtifacts.set(artifact.file, artifact)
      await pageArtifactHandlers.run(artifact)
    },
    runVite: viteHandlers.run,
    runBuildArtifacts: context => buildArtifactHandlers.run({
      pages: getPageArtifacts(),
      ...context,
    }),
    getPageArtifacts,
  }
}

/**
 * A name identifies a plugin: presets replace plugins by name and the runtime
 * loads `<name>/runtime`. Two plugins with one name would run twice.
 */
function assertUniquePluginNames(plugins: readonly KawaPressPlugin[]): void {
  const seen = new Set<string>()
  for (const plugin of plugins) {
    if (seen.has(plugin.name)) {
      throw new Error(
        `KawaPress: plugin ${JSON.stringify(plugin.name)} is registered more than once. `
        + 'To change a plugin a preset already includes, pass one plugin with the same name in `plugins`; it replaces the preset\'s.',
      )
    }
    seen.add(plugin.name)
  }
}
