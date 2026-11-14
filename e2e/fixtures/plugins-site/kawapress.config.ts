import process from 'node:process'
import commentsPlugin from '@kawapress/plugin-comments'
import { nagi } from 'kawapress/nagi'

/**
 * Site for the plugin E2E specs. It is built and served on its own port so the
 * documentation site keeps a clean configuration, and every plugin lane can add
 * its own plugin to the list below.
 */
export default nagi({
  title: 'KawaPress plugins',
  base: process.env.KAWAPRESS_BASE,
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
