import process from 'node:process'
import algoliaSearchPlugin from '@kawapress/plugin-algolia-search'
import commentsPlugin from '@kawapress/plugin-comments'
import { nagi } from 'kawapress/nagi'
import { siteKit } from './site-kit'

/**
 * Site for the plugin E2E specs. It is built and served on its own port so the
 * documentation site keeps a clean configuration, and every plugin lane can add
 * its own plugin to the list below.
 */
export default nagi({
  title: 'KawaPress plugins',
  base: process.env.KAWAPRESS_BASE,
  // Algolia takes the place of the built-in local search.
  search: false,
  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/kawapress/kawapress' },
      {
        icon: { svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>' },
        link: 'https://status.example.com',
        ariaLabel: 'Status',
      },
    ],
  },
  plugins: [
    siteKit(),
    algoliaSearchPlugin({
      // Placeholders: the specs intercept Algolia and never reach it.
      appId: 'FIXTUREAPP',
      apiKey: 'fixture-search-key',
      indexName: 'plugins',
    }),
    commentsPlugin({
      // Placeholders: the specs intercept https://giscus.app and never reach it.
      giscus: {
        repo: 'kawapress/kawapress',
        repoId: 'R_fixtureRepoId',
        category: 'Comments',
        categoryId: 'DIC_fixtureCategoryId',
      },
    }),
  ],
})
