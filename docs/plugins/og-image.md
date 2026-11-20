---
title: 分享图
description: 构建时为每个页面生成带标题、描述和站点名的社交分享卡片，并自动写入 og:image 等 meta，可用 Vue 组件自定义模板。
---

# 分享图

文档链接分享到 X、Discord、Slack 或微信时，带图的链接点击率更高。`@kawapress/plugin-og-image` 在构建时为每个页面生成一张 1200×630 的 PNG 分享图，并把 `og:image` 等 meta 写进页面的 `<head>`。不需要手工做图，也不需要在每个页面里配置。

## 安装 {#install}

::: code-group
```sh [npm]
npm install --save-dev @kawapress/plugin-og-image
```

```sh [pnpm]
pnpm add --save-dev @kawapress/plugin-og-image
```

```sh [Yarn]
yarn add --dev @kawapress/plugin-og-image
```
:::

插件的图片渲染依赖 `@resvg/resvg-js`，它是带预编译二进制的原生包。主流平台安装时会自动选取对应的二进制，无需额外编译环境。

## 启用分享图 {#enable-og-image}

在 `kawapress.config.ts` 中添加插件，并设置 `hostname`。`og:image` 必须是绝对地址，所以 `hostname` 是必填项：

```ts
import ogImage from '@kawapress/plugin-og-image'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    ogImage({ hostname: 'https://example.com' }),
  ],
})
```

插件会自动把站点的 `base` 追加到 `hostname` 后面，因此无需重复写入。`base` 为 `/handbook/` 时，`/guide/intro` 页面的分享图地址是 `https://example.com/handbook/og/guide/intro.png`。

构建后，每个页面都会有：

- 输出目录里的 `og/<路由>.png`，首页是 `og/index.png`，`/guide/intro` 是 `og/guide/intro.png`。
- 页面 `<head>` 里的 `og:image`、`og:image:width`、`og:image:height`、`twitter:card`（值为 `summary_large_image`）和 `twitter:image`。

内置模板是一张浅色卡片：顶部是站点名和一个小的强调色方块，中间是大号粗体的页面标题（标题较长时字号会缩小，中日韩字符按两倍宽度计算）和最多两行的页面描述，底部用分隔线隔开页面地址（去掉协议的 URL）。标题取自页面标题；描述依次取页面 Frontmatter、当前语言的 `description` 和站点的 `description`；站点名取自当前语言的 `title`，没有时取站点 `title`。

## 中文与其他非拉丁文字 {#cjk-fonts}

插件内置一份拉丁字体（Figtree，字重 400、500、600、700）。标题或描述里出现它没有的字形，比如汉字、日文假名、韩文，构建时会自动从 Google Fonts 下载对应的 Noto 字体子集，只包含卡片上实际出现的字符，中文站点不需要任何配置：

```ts
import ogImage from '@kawapress/plugin-og-image'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    ogImage({ hostname: 'https://example.com' }),
  ],
})
```

下载的是常规（400）和粗体（700）两个字重，按字符所属的文字选择字体：

- **汉字**：卡片里有假名，或页面语言是 `ja` 时用日文（JP）；`ko` 用韩文（KR）；`zh-TW`、`zh-Hant` 用繁体中文（TC）；`zh-HK` 用香港（HK）；其余用简体中文（SC）。
- **其他文字**：用对应的 Noto 字体，比如韩文（KR）、泰文、阿拉伯文、希伯来文、天城文等。
- **符号**：数学运算符用 Noto Sans Math，其他符号用 Noto Sans Symbols 或 Symbols 2；以上都不是的字符用 Noto Sans。
- **emoji 不在覆盖范围内**，仍然显示为空白方块。

下载的字体缓存在站点根目录下的 `node_modules/.cache/kawapress-og-image/fonts/`。每张卡片下载什么只取决于它自己的文字，所以缓存之后的构建不再需要联网。建议在 CI 中缓存 `node_modules/.cache/kawapress-og-image`。

### 远程字体选项 {#remote-fonts}

`remoteFonts` 默认开启，也可以传对象调整：

```ts
ogImage({
  hostname: 'https://example.com',
  remoteFonts: {
    endpoints: ['https://fonts.googleapis.com'],
    timeout: 10000,
  },
})
```

- `endpoints`：兼容 Google Fonts CSS API 的地址，按顺序尝试，默认 `['https://fonts.googleapis.com']`。提供同样 API 的镜像也可以使用。
- `timeout`：每个请求的超时时间，单位毫秒，默认 `10000`。连接中断时会重试一次；同一个地址连续失败两次，本次构建的后续请求会跳过它。
- **代理**：设置了 `HTTPS_PROXY` 或 `HTTP_PROXY` 时，请求会经过代理，并遵守 `NO_PROXY`。Node 自带的 `fetch` 不读取这些环境变量，由插件负责处理。
- **下载失败不会让构建失败**：构建时警告会列出错误，对应字符显示为空白方块，这张卡片不会写入缓存，下一次构建会重试。

::: warning 隐私
卡片上显示的字符（标题和描述）会在构建时发送给字体服务。如果不希望这样，设置 `remoteFonts: false` 保持构建离线，并用 `fonts` 提供字体文件。
:::

### 离线与自带字体 {#offline-fonts}

`fonts` 仍然可用，并且优先于远程字体：每个字符先用内置字体，没有该字形时依次回退到你提供的字体，最后才是远程字体。离线构建或需要指定字体时，用 `remoteFonts: false` 加 `fonts`：

```ts
import ogImage from '@kawapress/plugin-og-image'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    ogImage({
      hostname: 'https://example.com',
      remoteFonts: false,
      fonts: [
        { name: 'Noto Sans SC', path: 'fonts/NotoSansSC-Regular.otf', weight: 400 },
        { name: 'Noto Sans SC', path: 'fonts/NotoSansSC-Bold.otf', weight: 700 },
      ],
    }),
  ],
})
```

`path` 相对站点根目录。字体格式支持 TTF、OTF 和 WOFF，不支持 WOFF2。完整的中日韩字体动辄十几 MB，不适合直接放进仓库，可以用 `pyftsubset` 之类的工具只保留站点实际用到的字，得到几百 KB 的子集文件。

没有被任何字体覆盖的字符会显示为空白方块。构建时插件会提前警告，并列出受影响的页面和字符，图片仍然照常生成。警告只统计真正出现在卡片上的文字。

## 自定义模板 {#custom-template}

用 `template` 指定一个 Vue 单文件组件，路径相对站点根目录：

```ts
import ogImage from '@kawapress/plugin-og-image'
import { nagi } from 'kawapress/nagi'

export default nagi({
  plugins: [
    ogImage({
      hostname: 'https://example.com',
      template: 'og-card.vue',
    }),
  ],
})
```

模板组件会收到这些 props：

| Prop | 说明 |
| --- | --- |
| `title` | 页面标题 |
| `description` | 页面描述，没有时是空字符串 |
| `siteTitle` | 当前语言的站点标题 |
| `lang` | 当前语言的 `lang`，默认 `en` |
| `routePath` | 页面路由，例如 `/guide/intro` |
| `logo` | `logo` 选项的值，未设置时为空字符串 |
| `url` | 页面的绝对地址，例如 `https://example.com/guide/intro`（`hostname` + `base` + 路由） |
| `frontmatter` | 页面的 Frontmatter |

一个带站点 logo 的示例：

```vue
<!-- og-card.vue -->
<script setup lang="ts">
defineProps<{
  title: string
  description: string
  siteTitle: string
  frontmatter: Record<string, unknown>
}>()
</script>

<template>
  <div
    :style="{
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '64px 80px',
      backgroundColor: '#ffffff',
      color: '#111827',
      fontFamily: 'Figtree',
    }"
  >
    <div :style="{ display: 'flex', alignItems: 'center' }">
      <img src="/logo.png" width="56" height="56">
      <div :style="{ display: 'block', marginLeft: '20px', fontSize: '32px', fontWeight: 700 }">
        {{ siteTitle }}
      </div>
    </div>
    <div :style="{ display: 'block', fontSize: '68px', fontWeight: 700, lineHeight: 1.15 }">
      {{ title }}
    </div>
    <div :style="{ display: 'block', fontSize: '30px', color: '#6b7280', lineClamp: 2 }">
      {{ description }}
    </div>
  </div>
</template>
```

模板按构建站点的同一套 Vue 编译，可以使用 `<script setup>`、`v-if`、`v-for`、`:style` 和从站内导入的其他组件。它在构建时渲染成 HTML 字符串，再绘制成图片，不会在浏览器里运行，所以没有交互、生命周期和 `window`。

内置模板的源码是最好的起点：[`OgTemplate.vue`](https://github.com/kawapress/kawapress/blob/main/packages/plugin-og-image/src/template/OgTemplate.vue)。

### 支持的 CSS 范围 {#supported-css}

图片由 [satori](https://github.com/vercel/satori) 绘制，它只实现了 CSS 的一个子集。写模板时请注意：

- **样式写在 `style` 属性里**，对象写法 `:style="{ ... }"` 或字符串都可以。`<style>` 块和 class 选择器不会生效。
- **布局只有 flexbox。** 不支持 `grid` 和 `float`，`position` 只有 `relative` 和 `absolute`。
- **有多个子节点的元素必须写 `display: flex`。** 只包含文字的元素用 `display: block`（需要多行省略时用 `lineClamp`）。
- 常用的盒模型和排版属性可用：宽高、`margin`、`padding`、`border`、`borderRadius`、`gap`、`fontSize`、`fontWeight`、`fontFamily`、`lineHeight`、`letterSpacing`、`textAlign`、`color`、`opacity`、`boxShadow`、`transform`。
- 背景支持纯色、`linear-gradient`、`radial-gradient` 和图片。
- `fontFamily` 必须是内置的 `Figtree`，或 `fonts` 里声明的 `name`。内置字体提供 400、500、600、700 四个字重，`fonts` 里的字体只有提供了对应字体文件的字重才可用。
- 不支持 CSS 变量、动画和媒体查询。
- 模板里的文字在绘制前会解码 HTML 实体，`&` 等字符可以正常显示。
- 内置字体和远程字体都不含 emoji，emoji 会显示为空白方块。

完整的属性列表见 satori 的 [CSS 支持文档](https://github.com/vercel/satori#css)。

### 图片 {#images}

模板里的 `<img>` 必须写 `width` 和 `height`。以 `/` 开头的路径视为站内图片，构建时先从 `public/` 读取，再从站点根目录读取，转成 `data:` 内联进图片，支持 PNG、JPEG、GIF、WebP 和 SVG。找不到文件时构建报错。

`https://` 开头的远程图片由 satori 在构建时下载。除此之外，模板不应访问任何网络资源。

## 排除页面 {#exclude-pages}

在页面 Frontmatter 里写 `ogImage: false`，跳过这一页，不生成图片，也不写 meta：

```md
---
ogImage: false
---
```

用 `exclude` 按源文件路径批量排除。它是 glob，匹配相对于 `srcDir` 的 `sourcePath`：

```ts
ogImage({
  hostname: 'https://example.com',
  exclude: ['/changelog/**', '/drafts/*.md'],
})
```

站点、当前语言或页面自己的 `head` 里已经有 `og:image` 时，插件不会覆盖它，也不会为这一页生成图片。想给某一页换成自己的图，直接在它的 Frontmatter `head` 里写 `og:image` 即可：

```md
---
head:
  - - meta
    - property: og:image
      content: https://example.com/custom.png
---
```

## 缓存 {#cache}

每张图的缓存键由渲染后的模板内容、字体和图片大小计算得出，结果写在站点根目录下的 `node_modules/.cache/kawapress-og-image/`。内容没有变的页面不会重新绘制，二次构建几乎不增加时间。在 CI 中可以缓存这个目录。

修改模板、字体、站点标题或页面标题与描述，相关页面的缓存会自动失效。下载的远程字体缓存在同一目录下的 `fonts/`，卡片缓存在 `cards/`。

## 在开发服务器中预览 {#dev-preview}

调模板时不必完整构建。运行 `kawapress dev` 后，先打开一次目标页面，再访问 `/__og-image/<路由>.png`，例如 `/__og-image/guide/intro.png`，首页是 `/__og-image/index.png`。保存模板后刷新即可看到新效果。

开发服务器不会往页面里写 `og:image` 等 meta。

## 选项 {#options}

| 选项 | 说明 |
| --- | --- |
| `hostname` | 必填。站点的绝对地址，自动拼接 `base`。 |
| `template` | 自定义模板，Vue 单文件组件的路径，相对站点根目录。默认使用内置模板。 |
| `fonts` | 模板用到的字体，`{ name, path, weight?, style? }` 数组。内置一份拉丁字体（Figtree），优先于远程字体。 |
| `remoteFonts` | 构建时下载 Noto 字体子集，绘制内置字体和 `fonts` 都没有的字符。`boolean` 或 `{ endpoints?, timeout? }`，默认开启。`false` 保持构建离线。 |
| `logo` | 内置模板在站点名前显示的图片：public 目录下的路径（如 `/logo.png`）或绝对地址。不设置时显示一个小色块。 |
| `exclude` | 不生成分享图的页面，glob，匹配页面的 `sourcePath`。 |

## 注意事项 {#limitations}

- 只输出 PNG，固定为 1200×630。
- 404 页面和其他特殊布局的页面也会照常生成。不想要的页面用 `exclude` 或 `ogImage: false`。
- 字体、样式能力以 satori 为准。需要复杂排版时，可以把页面的一部分预先做成图片，再放进模板。
- 分享平台会缓存分享图。部署后看不到新图时，请使用平台提供的刷新工具，例如 Facebook Sharing Debugger 或 X 的 Card Validator。
