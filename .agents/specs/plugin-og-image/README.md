# OG Image 插件

包名 `@kawapress/plugin-og-image`。构建时为每个页面生成社交分享卡片图，并写好 `og:image` 等 meta。

- 工程实施：`.agents/engineering/002-official-plugins-batch-1/`

## 背景与目标

文档链接分享到 X、Discord、Slack、微信时，没有分享图的链接几乎没人点。手工给每页做图不现实，大部分站点只配一张全站通用图。Rspress 官方没有这个能力。

目标：零配置为每页生成带标题、描述和站点名的分享图；作者可以用一个 Vue 组件自定义模板；中文标题正常显示。

## Happy Path

```ts
import ogImage from '@kawapress/plugin-og-image'

export default nagi({
  plugins: [
    ogImage({ hostname: 'https://kawapress.dev' }),
  ],
})
```

构建后每页有 `og/<路由>.png`（1200×630），页面 `<head>` 有 `og:image`、`og:image:width`、`og:image:height`、`twitter:card=summary_large_image`、`twitter:image`。

## 选项

```ts
interface OgImagePluginOptions {
  /** 必填，og:image 必须是绝对地址。插件自动拼接 base。 */
  hostname: string
  /** 自定义模板：Vue SFC 的路径（相对站点根目录）。不写时用内置模板。 */
  template?: string
  /** 模板用到的字体。内置一份拉丁字体；含中日韩文字的站点需要自己提供字体文件。 */
  fonts?: Array<{ name: string, path: string, weight?: number, style?: 'normal' | 'italic' }>
  /** 排除的页面，glob 匹配 sourcePath。 */
  exclude?: string[]
}
```

模板组件收到的 props：`title`、`description`、`siteTitle`、`lang`、`routePath`、`frontmatter`。

## 行为

- 渲染链路：Vue SFC 模板 → Vue SSR 渲染成 HTML 字符串 → `satori-html` 转成 satori 节点 → `satori` 生成 SVG → `@resvg/resvg-js` 转 PNG → `emitFile`。模板通过 `buildArtifacts` 的 `importModule()` 加载，与站点的 Vue 编译走同一条路。
- 模板样式只能使用 satori 支持的 CSS 子集（flex 布局、内联 style 或 `<style>` 中的简单选择器，以实现能支持的为准）。文档写明支持范围，并提供内置模板源码作为起点。
- meta：在 `pageData()` 中写入页面的 `head`。页面或 locale 已经自己写了 `og:image` 时不覆盖，也不生成这一页的图。frontmatter `ogImage: false` 跳过单页。
- 字体：内置一份拉丁字体随包发布。页面标题或描述中出现内置字体没有的字形，且用户没有提供覆盖它的字体时，构建警告并列出页面，图照常生成（缺字显示为空白方块前先警告）。不在运行时下载字体。
- 缓存：按「模板源码 + 字体 + props」计算哈希，结果缓存在 `node_modules/.cache/kawapress-og-image/`，内容不变的页面不重新渲染。
- dev：提供 `/__og-image/<路由>.png` 预览地址，方便调模板；dev 下不往页面写 meta。

## 边界

- 只输出 PNG。
- 不支持模板里使用远程图片以外的网络资源；本地图片用站内路径，构建时读取并内联。
- 404 页面与 `layout: home` 以外的特殊布局照常生成；作者不想要的用 `exclude`。

## 验收

- 单元测试：meta 注入与不覆盖规则、`exclude` 和 `ogImage: false`、缓存命中、缺字警告。
- 文档站开启插件，构建后抽查中英文各一页的 PNG（中文页面用文档站提供的 CJK 字体），在 opengraph.xyz 等工具里预览 meta 正确。
- 构建时间：文档站全站生成增加的时间写进验证记录；二次构建命中缓存后接近零。
- 文档页 `docs/plugins/og-image.md` 与英文版，含自定义模板示例。
