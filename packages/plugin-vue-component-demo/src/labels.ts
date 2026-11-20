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
}

export const CHINESE_COMPONENT_DEMO_LABELS: ComponentDemoLabels = {
  expand: '展开源码',
  collapse: '收起源码',
  copy: '复制源码',
  copied: '已复制',
  loading: '示例加载中…',
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
