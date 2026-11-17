import type { MaybePromise, PageBuildArtifact } from 'kawapress'

export interface LlmsPluginOptions {
  llmsTxt?: (context: LlmsTxtContext) => MaybePromise<string | undefined>
}

export interface LlmsPage {
  routePath: string
  sourcePath: string
  title: string
  description?: string
  markdownUrl: string
  pageData: Readonly<PageBuildArtifact['pageData']>
}

export interface LlmsTxtContext {
  locale: string
  lang: string
  title: string
  description?: string
  pages: readonly LlmsPage[]
  defaultContent: string
}
