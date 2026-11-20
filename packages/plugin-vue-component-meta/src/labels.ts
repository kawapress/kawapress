import { resolveLocaleIndex } from 'kawapress'

/** Visible texts of one API table block. */
export interface ComponentApiLabels {
  /** Accessible name of the whole block. */
  region: string
  props: string
  events: string
  slots: string
  exposed: string
  name: string
  type: string
  default: string
  required: string
  description: string
  /** Column of the event table: the arguments an event carries. */
  payload: string
  /** Column of the slot table: the values a slot passes to its content. */
  bindings: string
  yes: string
  deprecated: string
  since: string
  /** Shown instead of the tables for a generic component. */
  genericUnsupported: string
  /** Shown when the component has nothing to document. */
  empty: string
}

export interface ComponentApiLabelOptions {
  /** Override default labels for every locale. */
  labels?: Partial<ComponentApiLabels>
  /** Override default labels for one KawaPress locale key. */
  localeLabels?: Record<string, Partial<ComponentApiLabels>>
}

export const ENGLISH_COMPONENT_API_LABELS: ComponentApiLabels = {
  region: 'Component API',
  props: 'Props',
  events: 'Events',
  slots: 'Slots',
  exposed: 'Exposed',
  name: 'Name',
  type: 'Type',
  default: 'Default',
  required: 'Required',
  description: 'Description',
  payload: 'Payload',
  bindings: 'Bindings',
  yes: 'Yes',
  deprecated: 'Deprecated',
  since: 'Since',
  genericUnsupported: 'Generic components are not supported yet, so their API cannot be extracted automatically.',
  empty: 'This component has no documented API.',
}

export const CHINESE_COMPONENT_API_LABELS: ComponentApiLabels = {
  region: '组件 API',
  props: 'Props',
  events: '事件',
  slots: '插槽',
  exposed: 'Exposes',
  name: '名称',
  type: '类型',
  default: '默认值',
  required: '必填',
  description: '说明',
  payload: '参数',
  bindings: '绑定值',
  yes: '是',
  deprecated: '已弃用',
  since: '自',
  genericUnsupported: '泛型组件暂不支持自动提取。',
  empty: '这个组件没有可记录的 API。',
}

/** Language of every locale key, e.g. `{ root: 'zh-CN', en: 'en' }`. */
export type ComponentApiLocaleLanguages = Record<string, string | undefined>

/** Picks the labels of the page at `path`: built-in texts, then the user's overrides. */
export function resolveComponentApiLabels(
  path: string,
  localeLanguages: ComponentApiLocaleLanguages,
  options: ComponentApiLabelOptions,
): ComponentApiLabels {
  const localeIndex = resolveLocaleIndex(path, Object.keys(localeLanguages))
  const builtIn = localeLanguages[localeIndex]?.toLowerCase().startsWith('zh')
    ? CHINESE_COMPONENT_API_LABELS
    : ENGLISH_COMPONENT_API_LABELS

  return {
    ...builtIn,
    ...options.labels,
    ...options.localeLabels?.[localeIndex],
  }
}
