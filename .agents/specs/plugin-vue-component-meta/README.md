# Vue 组件元数据插件

包名 `@kawapress/plugin-vue-component-meta`。构建时用 `vue-component-meta` 读出 Vue 组件的 props、events、slots 与 exposed，在文档里渲染成 API 表格，并作为 `plugin-vue-component-demo` 调节面板的数据来源。

- 搭档：`.agents/specs/plugin-vue-component-demo/`
- 工程实施：`.agents/engineering/004-vue-component-docs/`

## 背景与目标

组件库文档最费力、最容易过时的是 API 表格。`vue-component-meta`（vuejs/language-tools）用 TypeScript 类型检查器读组件，能拿到导入的类型、`withDefaults` 默认值和 JSDoc，比只做语法分析的 `vue-docgen-api`（2024 年后无维护）准确。

目标：

- 一个标签渲染出与源码一致的 API 表格，组件改了表格跟着变，不需要手写。
- 同一份数据既给人看（HTML 表格），也给 Agent 看（页面 `.md` 与 `llms.txt` 中是 Markdown 表格）。
- 给 demo 插件提供规范化的「控件描述」，让它不必理解 TypeScript 类型。

## Happy Path

```md
<ComponentApi src="../src/Button.vue" />
```

渲染 Props、Events、Slots、Exposed 四节表格，空的节省略。Props 表列：名称、类型、默认值、必填、说明。说明来自 JSDoc，`@deprecated` 显示删除线与提示，`@since` 显示版本标签。

只要其中一部分：`<ComponentApi src="../src/Button.vue" only="props" />`。

## 选项

```ts
interface VueComponentMetaPluginOptions {
  /** 用于类型检查的 tsconfig，相对站点根目录。默认从组件所在目录向上查找。 */
  tsconfig?: string
  /** 不展开的类型名，例如很大的 DOM 类型；它们在表格里只显示类型名。 */
  ignoreTypes?: string[]
  /** Markdown 里的标签名，默认 `ComponentApi`。 */
  tag?: string
}
```

## 数据模型

插件导出两层数据：

1. **原始元数据**：`vue-component-meta` 的输出，去掉 `declarations`、函数等不可序列化字段，过滤掉 `global: true` 的 Vue 全局属性（`key`、`ref` 等）。
2. **规范化模型** `ComponentDoc`，表格和 demo 都只用它：

```ts
interface ComponentDoc {
  name: string
  description: string
  props: PropDoc[]
  events: EventDoc[]
  slots: SlotDoc[]
  exposed: ExposedDoc[]
}

interface PropDoc {
  name: string
  type: string            // 去掉 `| undefined` 后的类型文本
  required: boolean
  default?: string        // 源码里的默认值文本
  description: string
  tags: Record<string, string>   // @deprecated、@since、@control 等
  control: PropControl
}

type PropControl =
  | { kind: 'boolean' }
  | { kind: 'number' }
  | { kind: 'text' }
  | { kind: 'select', options: (string | number)[] }   // 字面量联合
  | { kind: 'json' }      // object、array、string | number 等复合类型
  | { kind: 'none' }      // 函数、VNode、Component 等不可编辑的类型
```

控件推断：先去掉联合里的 `undefined`；只剩 `true`/`false` 是 `boolean`；全部是字符串或数字字面量是 `select`；只剩 `string` 或 `number` 对应 `text`、`number`；`object`/`array` 是 `json`；函数是 `none`。JSDoc 的 `@control text|number|boolean|json|none` 覆盖推断，`@ignore` 让这个 prop 不进表格也不进面板。

## 接入方式

- **Vite 插件**：`import doc from './Button.vue?component-doc'` 得到 `ComponentDoc` 的默认导出。`<ComponentApi>` 与 demo 插件都通过这个查询加载数据，构建时它是静态 JSON，不会把检查器打进客户端。
- **检查器**：每个 tsconfig 一个，懒创建、常驻。找不到 tsconfig 时用内置的最小配置（`strict`、`moduleResolution: bundler`）。
- **开发时**：组件或它引用的 `.ts` 改动时 `updateFile` 后失效对应的 `?component-doc` 模块；新增、删除文件时 `reload()`。
- **Markdown 标签**：生成侧把 `<ComponentApi src>` 改写成对内部组件 `KawaComponentApi` 的使用，并通过 `addPageComponent` 按页引入；`src` 相对当前 Markdown 文件，也可以写 Vite alias。
- **给 Agent 的输出**：页面 `.md`（SSG-MD）里输出 Markdown 表格，内容与 HTML 相同。

## 约束

- `typescript` 是 peer 依赖，支持 6.x；TypeScript 7（原生实现）不提供检查器所需的 JS API，暂不支持。
- 泛型组件（`<script setup generic="T">`）目前读不出 props，表格显示「泛型组件暂不支持自动提取」的提示，并在构建时警告。这是 `vue-component-meta` 的限制。
- emits 的说明要写在类型字面量属性的 JSDoc 上；调用签名写法（`(e: 'change', v: number): void`）上的注释会丢失。
- 首次分析需要约 0.3 秒、约 300 MB 内存；只有用到 `<ComponentApi>` 或 demo 调节面板的页面才会触发。

## 不做

- 不生成独立的 API 页面（那需要核心的插件页面能力，见 `.agents/specs/core-plugin-pages/`）。
- 不支持 React 等其他框架。
- 不读取 JS 组件以外的运行时信息，不执行组件。

## 验收

- 文档站用一个示例组件展示 `<ComponentApi>`，覆盖 props（含导入类型、默认值、字面量联合、对象）、events、slots、exposed。
- 修改组件的 prop 后，开发服务器里表格热更新。
- 页面 `.md` 里有对应的 Markdown 表格。
- 构建产物的客户端代码里没有 `typescript` 与 `vue-component-meta`。
