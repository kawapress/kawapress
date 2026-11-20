# Vue 组件演示插件

包名 `@kawapress/plugin-vue-component-demo`。在文档里展示真实渲染的 Vue 组件示例和它的源码；与 `plugin-vue-component-meta` 同时安装时，还能为组件生成属性调节面板。

- 搭档：`.agents/specs/plugin-vue-component-meta/`
- 工程实施：`.agents/engineering/004-vue-component-docs/`

## 背景与目标

Vue 组件库的文档几乎都有「效果 + 源码」演示块，VitePress 生态靠 vitepress-demo-plugin、@vitepress-demo-preview 等第三方插件实现，它们都只有静态演示。调节面板（类似 Storybook Controls）只在 Storybook、Histoire 这类独立工具里有。KawaPress 把两者放进同一个文档站，是面向组件库作者的差异点。

目标：

- 示例写成独立的 `.vue` 文件，编辑器里有完整类型提示，组件库可以复用。
- 示例在页面里真实渲染（SSR + hydration），不是 iframe 沙箱，也不是 REPL。
- 展示的源码与渲染效果始终一致。
- 装了 meta 插件时，一行就能得到可调节的组件演练区。

## Happy Path

**静态示例**：引用一个示例文件。

```md
<ComponentDemo src="./demos/ButtonBasic.vue" title="基础用法" description="按钮有三种尺寸。" />
```

上方是渲染出的示例，下方是标题、说明和工具栏（展开源码、复制）。源码默认折叠，展开后是与站点代码块一致的 Shiki 高亮（明暗双主题）。

**调节面板**：指向组件本身。

```md
<ComponentDemo component="../src/Button.vue" />
```

左侧是由面板参数渲染的 `<Button v-bind="args" />`，右侧是调节面板，下方是随参数实时变化的源码片段，例如 `<Button size="small" disabled />`。面板控件来自 meta 插件的 `PropControl`。

## 标签属性

| 属性 | 说明 |
| --- | --- |
| `src` | 示例文件，相对当前 Markdown 文件，也可以写 Vite alias。与 `component` 二选一。 |
| `component` | 组件文件，生成调节演练区。需要安装 meta 插件，否则构建报错并提示安装。 |
| `title`、`description` | 标题与说明，支持行内 Markdown。 |
| `client-only` | 示例依赖浏览器 API 时只在客户端渲染，服务端输出占位。 |
| `props` | 仅 `component` 模式：演练区的初始参数，JSON 字符串，例如 `props='{"label":"提交"}'`。必填且没有默认值的 prop 需要在这里给值。 |

## 选项

```ts
interface VueComponentDemoPluginOptions {
  /** Markdown 里的标签名，默认 `ComponentDemo`。 */
  tag?: string
  /** 源码默认展开，默认 false。 */
  expandSource?: boolean
}
```

## 调节面板

- 控件：`boolean` 开关、`number` 数字输入、`text` 文本输入、`select`（不超过 5 项用单选按钮组，多于 5 项用下拉框）、`json` 文本框（输入合法 JSON 才生效）。`none` 类型的 prop 不出现在面板里。
- 初始值：`props` 属性 > prop 默认值 > 不传。服务端与客户端使用同一组初始值，保证 hydration 一致。
- 事件：组件的 events 全部监听，触发时在面板下方的事件日志里追加一行（事件名 + 参数的 JSON），最多保留 20 条。
- 「重置」按钮恢复初始值。
- `v-model`：`modelValue` 与 `update:modelValue` 自动连起来，组件内部改值时面板同步。

## 实现要点

- 生成侧把标签改写成内部组件 `KawaComponentDemo` 的使用：示例或组件文件通过 `addPageComponent(env, { name, from: 绝对路径 })` 按页引入；源码通过 Vite 查询 `?component-demo-source` 加载，在构建时用站点的 Shiki 配置高亮成 HTML。这样示例文件改动时，渲染结果和源码都能热更新，不需要重新编译 Markdown 页面。
- `component` 模式通过 meta 插件的 `?component-doc` 查询拿到 `ComponentDoc`；meta 插件是否安装在 `configResolved` 里按插件名检查。
- 页面 `.md`（SSG-MD）里输出标题、说明和完整源码代码块，不输出渲染结果；`component` 模式输出组件的 Props 表格。
- 样式放在 `@layer kawa.plugin`，只读 `--kawa-*` Token。示例本身的样式由示例负责，插件不隔离。

## 以后再做

- 一个示例由多个文件组成时的多标签源码。
- iframe 隔离模式与移动设备外框。
- 「在演练场中打开」：安装了 `plugin-vue-repl` 时把示例源码交给它。
- 「在 GitHub 上查看」链接。
- 名称匹配的颜色、日期控件。
- 代码块写法（```` ```vue demo ````）。

## 验收

- 文档站有一页组件演示示例：一个静态示例、一个 `client-only` 示例、一个调节演练区（覆盖 boolean、number、text、select、json 与事件日志、`v-model`）。
- 修改示例文件后，开发服务器里渲染结果和展开的源码都会更新。
- 生产构建与 `kawapress preview` 下无 hydration 警告（e2e 守护）。
- 未安装 meta 插件时使用 `component` 属性，构建报错并指明需要安装的包。
