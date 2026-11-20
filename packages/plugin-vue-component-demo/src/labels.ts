import { resolveLocaleIndex } from 'kawapress'

/** Visible and accessible texts of one component demo. */
export interface ComponentDemoLabels {
  /** Button that shows the source while it is collapsed. */
  expand: string
  /** Button that hides the source while it is expanded. */
  collapse: string
  /** Button that copies the source code. */
  copy: string
  /** Feedback after the source was copied. */
  copied: string
  /** Placeholder of a `client-only` demo until it renders in the browser. */
  loading: string
  /** Heading of the controls panel of a playground. */
  controls: string
  /** Button that restores the initial args of a playground. */
  reset: string
  /** Heading of the event log. */
  events: string
  /** Button that empties the event log. */
  clearEvents: string
  /** Shown while the event log is empty. */
  noEvents: string
  /** Mark of a required prop. */
  required: string
  /** Shown under a JSON control whose text does not parse. */
  invalidJson: string
  /** Accessible name of the live source snippet. */
  snippet: string
  /** Column headings of the props table in the page `.md`. */
  propName: string
  propType: string
  propDefault: string
  propDescription: string
}

export interface ComponentDemoLabelOptions {
  /** Override default labels for every locale. */
  labels?: Partial<ComponentDemoLabels>
  /** Override default labels for one KawaPress locale key. */
  localeLabels?: Record<string, Partial<ComponentDemoLabels>>
}

export const ENGLISH_COMPONENT_DEMO_LABELS: ComponentDemoLabels = {
  expand: 'Show source',
  collapse: 'Hide source',
  copy: 'Copy source',
  copied: 'Copied',
  loading: 'Loading demo…',
  controls: 'Controls',
  reset: 'Reset',
  events: 'Events',
  clearEvents: 'Clear',
  noEvents: 'No events yet',
  required: 'required',
  invalidJson: 'Invalid JSON, the last valid value stays in use',
  snippet: 'Usage',
  propName: 'Prop',
  propType: 'Type',
  propDefault: 'Default',
  propDescription: 'Description',
}

export const CHINESE_COMPONENT_DEMO_LABELS: ComponentDemoLabels = {
  expand: '展开源码',
  collapse: '收起源码',
  copy: '复制源码',
  copied: '已复制',
  loading: '示例加载中…',
  controls: '调节面板',
  reset: '重置',
  events: '事件',
  clearEvents: '清空',
  noEvents: '暂无事件',
  required: '必填',
  invalidJson: 'JSON 不合法，仍使用上一次的有效值',
  snippet: '用法',
  propName: '属性',
  propType: '类型',
  propDefault: '默认值',
  propDescription: '说明',
}

/** Language of every locale key, e.g. `{ root: 'zh-CN', en: 'en' }`. */
export type ComponentDemoLocaleLanguages = Record<string, string | undefined>

/** Picks the labels of the page at `path`: built-in texts, then the user's overrides. */
export function resolveComponentDemoLabels(
  path: string,
  localeLanguages: ComponentDemoLocaleLanguages,
  options: ComponentDemoLabelOptions,
): ComponentDemoLabels {
  const localeIndex = resolveLocaleIndex(path, Object.keys(localeLanguages))
  const builtIn = localeLanguages[localeIndex]?.toLowerCase().startsWith('zh')
    ? CHINESE_COMPONENT_DEMO_LABELS
    : ENGLISH_COMPONENT_DEMO_LABELS

  return {
    ...builtIn,
    ...options.labels,
    ...options.localeLabels?.[localeIndex],
  }
}
