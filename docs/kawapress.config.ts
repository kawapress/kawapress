import process from 'node:process'
import commentsPlugin from '@kawapress/plugin-comments'
import fileTreePlugin from '@kawapress/plugin-file-tree'
import imageZoomPlugin from '@kawapress/plugin-image-zoom'
import lastUpdatedPlugin from '@kawapress/plugin-last-updated'
import mathjaxPlugin from '@kawapress/plugin-mathjax'
import mermaidPlugin from '@kawapress/plugin-mermaid'
import ogImagePlugin from '@kawapress/plugin-og-image'
import vueComponentDemoPlugin from '@kawapress/plugin-vue-component-demo'
import vueComponentMetaPlugin from '@kawapress/plugin-vue-component-meta'
import vueReplPlugin from '@kawapress/plugin-vue-repl'
import { nagi } from 'kawapress/nagi'
import { guideSidebars, pluginSidebars } from './sidebar'

export default nagi({
  title: 'KawaPress',
  description: '由 Vite 和 Vue 驱动的静态站点生成器。',
  base: process.env.KAWAPRESS_BASE,
  runtimePlugin: './theme/runtime-plugin.ts',
  plugins: [
    imageZoomPlugin(),
    mathjaxPlugin(),
    mermaidPlugin(),
    fileTreePlugin(),
    vueReplPlugin(),
    vueComponentMetaPlugin(),
    vueComponentDemoPlugin(),
    ogImagePlugin({ hostname: 'https://kawapress.dev', logo: '/kawapress-logo.png' }),
    lastUpdatedPlugin({
      editLink: {
        pattern: 'https://github.com/kawapress/kawapress/edit/main/:path',
      },
    }),
    commentsPlugin({
      // giscus 只读取 GitHub Discussions，站点本身不存任何评论数据。
      giscus: {
        repo: 'kawapress/kawapress',
        repoId: 'R_kgDOUBnCOQ',
        category: 'Announcements',
        categoryId: 'DIC_kwDOUBnCOc4DJuT-',
      },
    }),
  ],
  themeConfig: {
    logo: {
      light: '/kawapress-logo.png',
      dark: '/kawapress-logo-dark.png',
      alt: 'KawaPress',
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/kawapress/kawapress' }],
    nav: [
      { text: '指南', link: '/guide/what-is-kawapress', activeMatch: '/guide' },
      { text: '插件', link: '/plugins/', activeMatch: '/plugins' },
    ],
    sidebar: {
      '/guide/': guideSidebars.zhCN,
      '/plugins/': pluginSidebars.zhCN,
    },
  },
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
    },
    en: {
      label: 'English',
      lang: 'en',
      description: 'A Vite & Vue powered static site generator.',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/what-is-kawapress', activeMatch: '/en/guide' },
          { text: 'Plugins', link: '/en/plugins/', activeMatch: '/en/plugins' },
        ],
        sidebar: {
          '/en/guide/': guideSidebars.en,
          '/en/plugins/': pluginSidebars.en,
        },
      },
    },
  },
})
