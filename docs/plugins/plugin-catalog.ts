/**
 * What the plugin market shows that `package.json` cannot say: category,
 * documentation page and a one-line description in each language.
 *
 * Every public `packages/plugin-*` package must have an entry here, and every
 * entry must name a real package; `plugins.data.ts` fails the build otherwise.
 */

export type PluginCategory
  = | 'markdown'
    | 'code'
    | 'search'
    | 'content'
    | 'page'
    | 'vue'
    | 'integration'

export interface PluginCatalogEntry {
  category: PluginCategory
  /** Documentation path without the locale prefix, for example `/plugins/mermaid`. Omitted when there is no page yet. */
  docs?: string
  description: { zhCN: string, en: string }
}

export const categoryLabels: Record<PluginCategory, { zhCN: string, en: string }> = {
  markdown: { zhCN: 'Markdown 语法', en: 'Markdown syntax' },
  code: { zhCN: '代码', en: 'Code' },
  search: { zhCN: '搜索', en: 'Search' },
  content: { zhCN: '内容与 SEO', en: 'Content & SEO' },
  page: { zhCN: '页面增强', en: 'Page enhancements' },
  vue: { zhCN: 'Vue 组件开发', en: 'Vue component docs' },
  integration: { zhCN: '集成服务', en: 'Integrations' },
}

export const pluginCatalog: Record<string, PluginCatalogEntry> = {
  '@kawapress/plugin-algolia-search': {
    category: 'search',
    docs: '/plugins/algolia-search',
    description: {
      zhCN: '接入 Algolia DocSearch 云端搜索，按需加载，支持多语言过滤。',
      en: 'Algolia DocSearch, loaded on demand, with per-language filtering.',
    },
  },
  '@kawapress/plugin-analytics': {
    category: 'integration',
    docs: '/plugins/analytics',
    description: {
      zhCN: '一份配置接入 Google Analytics、Plausible、Umami 与 Cloudflare 统计，站内跳转也能统计到。',
      en: 'Google Analytics, Plausible, Umami and Cloudflare in one config, with in-site navigation counted.',
    },
  },
  '@kawapress/plugin-badge': {
    category: 'markdown',
    docs: '/guide/markdown-extensions#badges',
    description: {
      zhCN: '行内徽标组件 `<Badge>`，标记状态和版本。',
      en: 'The inline `<Badge>` component for status and version marks.',
    },
  },
  '@kawapress/plugin-code-block': {
    category: 'code',
    docs: '/guide/markdown-extensions#code-blocks',
    description: {
      zhCN: '代码块的语言标签、复制按钮和可选行号。',
      en: 'Language labels, a copy button and optional line numbers for code blocks.',
    },
  },
  '@kawapress/plugin-code-group': {
    category: 'code',
    docs: '/guide/markdown-extensions#code-blocks',
    description: {
      zhCN: '把几个代码块合成带标签页的一组。',
      en: 'Groups several code blocks into tabs.',
    },
  },
  '@kawapress/plugin-comments': {
    category: 'integration',
    docs: '/plugins/comments',
    description: {
      zhCN: '用 GitHub Discussions 给每篇文档开评论区。',
      en: 'A comment thread for every page, backed by GitHub Discussions.',
    },
  },
  '@kawapress/plugin-container': {
    category: 'markdown',
    docs: '/guide/markdown-extensions#custom-containers',
    description: {
      zhCN: '`info`、`tip`、`warning`、`danger` 与可折叠的 `details` 容器。',
      en: '`info`, `tip`, `warning`, `danger` and collapsible `details` containers.',
    },
  },
  '@kawapress/plugin-emoji': {
    category: 'markdown',
    docs: '/guide/markdown-extensions#emoji',
    description: {
      zhCN: '`:tada:` 等 GitHub 风格的 Emoji 短代码。',
      en: 'GitHub-style emoji shortcodes such as `:tada:`.',
    },
  },
  '@kawapress/plugin-feed': {
    category: 'content',
    docs: '/plugins/feed',
    description: {
      zhCN: '为博客和更新日志生成 RSS、Atom 与 JSON Feed，并加上自动发现链接。',
      en: 'RSS, Atom and JSON Feed for blogs and changelogs, with autodiscovery links.',
    },
  },
  '@kawapress/plugin-file-tree': {
    category: 'markdown',
    docs: '/plugins/file-tree',
    description: {
      zhCN: '用缩进写目录结构，渲染成带文件图标、可折叠的文件树，不需要客户端 JS。',
      en: 'Indented text becomes a folding file tree with file icons, and no client JS.',
    },
  },
  '@kawapress/plugin-github-alerts': {
    category: 'markdown',
    docs: '/guide/markdown-extensions#github-alerts',
    description: {
      zhCN: 'GitHub 风格的提示块 `> [!NOTE]`。',
      en: 'GitHub-style alerts written as `> [!NOTE]`.',
    },
  },
  '@kawapress/plugin-image-zoom': {
    category: 'page',
    docs: '/plugins/image-zoom',
    description: {
      zhCN: '点击正文图片放大查看。',
      en: 'Click an image in the page to zoom in.',
    },
  },
  '@kawapress/plugin-last-updated': {
    category: 'content',
    docs: '/plugins/last-updated',
    description: {
      zhCN: '页面底部的「最后更新于」和「编辑此页」。',
      en: '"Last updated" and "Edit this page" at the bottom of each page.',
    },
  },
  '@kawapress/plugin-llms': {
    category: 'content',
    docs: '/guide/ai-ready-documentation',
    description: {
      zhCN: '为每页生成 Markdown，输出 `llms.txt` 与 `llms-full.txt`，并提供复制页面按钮。',
      en: 'Per-page Markdown, `llms.txt` and `llms-full.txt`, plus a copy-page button.',
    },
  },
  '@kawapress/plugin-mathjax': {
    category: 'markdown',
    docs: '/guide/markdown-extensions#math-equations',
    description: {
      zhCN: '构建时把 `$…$` 和 `$$…$$` 渲染成数学公式。',
      en: 'Renders `$…$` and `$$…$$` as math at build time.',
    },
  },
  '@kawapress/plugin-mermaid': {
    category: 'markdown',
    docs: '/plugins/mermaid',
    description: {
      zhCN: '用文字画流程图、时序图等，支持缩放与图码切换。',
      en: 'Flowcharts, sequence diagrams and more from text, with zoom and a code view.',
    },
  },
  '@kawapress/plugin-og-image': {
    category: 'content',
    docs: '/plugins/og-image',
    description: {
      zhCN: '构建时为每个页面生成社交分享卡片图，模板是一个 Vue 组件。',
      en: 'A social card image for every page at build time, from a Vue component template.',
    },
  },
  '@kawapress/plugin-search': {
    category: 'search',
    description: {
      zhCN: '本地全文搜索，首次打开搜索时才加载索引。',
      en: 'Local full-text search; the index loads the first time search opens.',
    },
  },
  '@kawapress/plugin-shiki': {
    category: 'code',
    docs: '/guide/markdown-extensions#code-blocks',
    description: {
      zhCN: '明暗双主题代码高亮、行高亮、diff 标记与 Twoslash 类型提示。',
      en: 'Light and dark highlighting, line highlights, diff marks and Twoslash type hints.',
    },
  },
  '@kawapress/plugin-sitemap': {
    category: 'content',
    docs: '/plugins/sitemap',
    description: {
      zhCN: '生成 `sitemap.xml`，支持多语言备选与最后更新时间。',
      en: '`sitemap.xml` with language alternates and last-modified dates.',
    },
  },
  '@kawapress/plugin-toc': {
    category: 'markdown',
    docs: '/guide/markdown-extensions#table-of-contents',
    description: {
      zhCN: '把 `[[toc]]` 渲染成当前页面的章节目录。',
      en: 'Renders `[[toc]]` as the table of contents of the page.',
    },
  },
  '@kawapress/plugin-vue-repl': {
    category: 'vue',
    docs: '/plugins/vue-repl',
    description: {
      zhCN: '在文档里嵌入 `@vue/repl`，读者可以直接编辑并运行 Vue 代码；点击运行前不加载编辑器。',
      en: 'Embeds `@vue/repl` so readers can edit and run Vue code; the editor loads only on Run.',
    },
  },
  '@kawapress/plugin-vue-component-demo': {
    category: 'vue',
    docs: '/plugins/vue-component-demo',
    description: {
      zhCN: '用独立的 .vue 文件写组件示例，页面上展示真实渲染的效果和高亮源码；配合组件 API 插件还有属性调节面板。',
      en: 'Demos written as standalone .vue files, rendered live with highlighted source; with the Component API plugin, a props controls panel too.',
    },
  },
  '@kawapress/plugin-vue-component-meta': {
    category: 'vue',
    docs: '/plugins/vue-component-meta',
    description: {
      zhCN: '从组件源码读出 Props、事件、插槽与 Exposes，渲染成随源码更新的 API 表格。',
      en: 'Reads props, events, slots and exposed members from component source into API tables that stay in sync.',
    },
  },
  '@kawapress/plugin-unocss': {
    category: 'page',
    description: {
      zhCN: '接入 UnoCSS，在 Markdown 里直接写工具类。',
      en: 'UnoCSS, so Markdown can use utility classes.',
    },
  },
}
