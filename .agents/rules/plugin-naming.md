# 插件命名与发现

## 官方插件

- 包名 `@kawapress/plugin-<name>`。
- 插件的核心是包装某个第三方工具时，`<name>` 用该工具的名字，例如 `plugin-shiki`、`plugin-mermaid`、`plugin-unocss`、`plugin-typedoc`、`plugin-vue-repl`。用户从名字就能知道它基于什么、文档该去哪里查。
- 同时对接多个服务或不绑定具体工具时，用功能名，例如 `plugin-analytics`、`plugin-search`、`plugin-og-image`。
- Generator Plugin 与 Runtime Plugin 的 `name` 与包名完全一致。

## npm keywords

所有官方插件的 `package.json` 都带：

```json
"keywords": ["kawapress", "kawapress-plugin"]
```

Preset 用 `kawapress-preset`，主题用 `kawapress-theme`，代替 `kawapress-plugin`。

## 社区插件

文档向社区推荐的命名是 `kawapress-plugin-<name>` 或 `@scope/kawapress-plugin-<name>`，并要求带 `kawapress-plugin` keyword。插件市场的「社区插件」入口按这个 keyword 在 npm 上检索，规则改动时同步改插件开发文档的发布检查清单。
