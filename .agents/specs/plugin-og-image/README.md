# OG Image 插件

包名 `@kawapress/plugin-og-image`。构建时为每个页面生成社交分享卡片图，并写好 `og:image` 等 meta。

- 工程实施：`.agents/engineering/002-official-plugins-batch-1/`

## 背景与目标

文档链接分享到 X、Discord、Slack、微信时，没有分享图的链接几乎没人点。手工给每页做图不现实，大部分站点只配一张全站通用图。Rspress 官方没有这个能力。

目标：零配置为每页生成带标题、描述和站点名的分享图；作者可以用一个 Vue 组件自定义模板；中文标题开箱即用，正常显示。

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
  /** 模板用到的字体。内置一份拉丁字体（Figtree）；优先于远程字体，是离线路径。 */
  fonts?: Array<{ name: string, path: string, weight?: number, style?: 'normal' | 'italic' }>
  /**
   * 构建时为内置字体和 fonts 都没有的字符下载 Noto 字体子集，默认开启，false 保持离线。
   * endpoints：兼容 Google Fonts CSS API 的地址，按顺序尝试，默认 ['https://fonts.googleapis.com']。
   * timeout：单个请求的超时（毫秒），默认 10000。
   */
  remoteFonts?: boolean | { endpoints?: string[], timeout?: number }
  /** 排除的页面，glob 匹配 sourcePath。 */
  exclude?: string[]
}
```

模板组件收到的 props：`title`、`description`、`siteTitle`、`lang`、`routePath`、`url`、`frontmatter`。`url` 是页面的绝对地址（hostname + base + 路由），例如 `https://example.com/guide/intro`。

## 行为

- 渲染链路：Vue SFC 模板 → Vue SSR 渲染成 HTML 字符串 → `satori-html` 转成 satori 节点 → `satori` 生成 SVG → `@resvg/resvg-js` 转 PNG → `emitFile`。模板通过 `buildArtifacts` 的 `importModule()` 加载，与站点的 Vue 编译走同一条路。
- 内置模板是浅色卡片：顶部站点名加一个小的强调色方块，中间是大号粗体标题（标题长时缩小字号，中日韩字符按两倍宽度计）和最多两行描述，底部分隔线下是页面地址（url 去掉协议）。内置拉丁字体是 Figtree（latin 子集，字重 400、500、600、700）；`fontFamily` 只能是内置的 Figtree 或 `fonts` 里声明的 name。
- 模板里的文字在绘制前做 HTML 实体解码。
- 模板样式只能使用 satori 支持的 CSS 子集（flex 布局、内联 style 或 `<style>` 中的简单选择器，以实现能支持的为准）。文档写明支持范围，并提供内置模板源码作为起点。
- meta：在 `pageData()` 中写入页面的 `head`。页面或 locale 已经自己写了 `og:image` 时不覆盖，也不生成这一页的图。frontmatter `ogImage: false` 跳过单页。
- 字体：内置 Figtree 随包发布。字符先用内置字体，再用 `fonts`，最后用远程字体。
- 远程字体：`remoteFonts` 默认开启。构建时只为内置字体和 `fonts` 都没有的字符，从 Google Fonts CSS API 下载 Noto 子集（常规 400 与粗体 700），且只含卡片上出现的字符。汉字：卡片含假名或页面语言为 ja 用 JP；ko 用 KR；zh-TW、zh-Hant 用 TC；zh-HK 用 HK；其余用 SC。其他文字用对应 Noto 家族（KR、Thai、Arabic、Hebrew、Devanagari 等），数学运算符用 Noto Sans Math，其他符号用 Noto Sans Symbols、Symbols 2，其余用 Noto Sans。emoji 不覆盖，仍为空白方块。
- 远程字体的网络行为：`endpoints` 按顺序尝试；连接中断重试一次，同一 endpoint 失败两次则本次构建余下请求跳过它。设置了 `HTTPS_PROXY`、`HTTP_PROXY` 时请求走代理并遵守 `NO_PROXY`（Node 自带 fetch 不读这些变量，由插件处理）。下载失败不让构建失败：警告列出错误，字符显示为空白方块，这张卡不写入缓存，下次构建重试。不在规约或文档里指名或推荐具体第三方镜像。
- 隐私：卡片上显示的字符（标题、描述）会在构建时发送给字体服务；需要离线时设 `remoteFonts: false` 并用 `fonts` 提供字体文件。
- 缺字警告：页面里有没被任何字体覆盖的字符时，构建警告并列出页面和字符，图照常生成（显示为空白方块）。只统计真正出现在渲染后卡片 HTML 里的文字。
- 缓存：卡片按「渲染后的模板内容 + 字体 + 图片大小」计算哈希，缓存在 `node_modules/.cache/kawapress-og-image/cards/`，内容不变的页面不重新渲染；下载的字体缓存在同目录的 `fonts/`。一张卡下载什么只取决于它自己的文字，缓存后的构建可完全离线。文档建议 CI 缓存 `node_modules/.cache/kawapress-og-image`。
- dev：提供 `/__og-image/<路由>.png` 预览地址，方便调模板；dev 下不往页面写 meta。

## 边界

- 只输出 PNG。
- 不支持模板里使用远程图片以外的网络资源；本地图片用站内路径，构建时读取并内联。
- 404 页面与 `layout: home` 以外的特殊布局照常生成；作者不想要的用 `exclude`。

## 验收

- 单元测试：meta 注入与不覆盖规则、`exclude` 和 `ogImage: false`、缓存命中、缺字警告、远程字体（字体选择、缓存、失败降级、代理）。
- 文档站开启插件，构建后抽查中英文各一页的 PNG（中文页面使用远程字体，无需自带字体），在 opengraph.xyz 等工具里预览 meta 正确。
- 构建时间：文档站全站生成增加的时间写进验证记录；二次构建命中缓存后接近零。
- 文档页 `docs/plugins/og-image.md` 与英文版，含自定义模板示例。
