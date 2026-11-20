import { resolveLocaleIndex } from 'kawapress'

/** Visible and accessible texts of one Vue REPL block. */
export interface VueReplLabels {
  /** Accessible name of the whole block. */
  region: string
  /** Button that loads the editor and the preview. */
  run: string
  /** Text of the run button while the REPL is loading. */
  loading: string
  /** Link to play.vuejs.org. */
  playground: string
  /** Shown when the REPL could not be loaded, for example when the network is down. */
  failed: string
}

export interface VueReplLabelOptions {
  /** Override default labels for every locale. */
  labels?: Partial<VueReplLabels>
  /** Override default labels for one KawaPress locale key. */
  localeLabels?: Record<string, Partial<VueReplLabels>>
}

export const ENGLISH_VUE_REPL_LABELS: VueReplLabels = {
  region: 'Runnable Vue example',
  run: 'Run',
  loading: 'Loading…',
  playground: 'Open in Vue Playground',
  failed: 'The playground could not be loaded. Check your network and try again.',
}

export const CHINESE_VUE_REPL_LABELS: VueReplLabels = {
  region: '可运行的 Vue 示例',
  run: '运行',
  loading: '加载中…',
  playground: '在 Vue Playground 中打开',
  failed: '无法加载 Playground，请检查网络后重试。',
}

/** Language of every locale key, e.g. `{ root: 'zh-CN', en: 'en' }`. */
export type VueReplLocaleLanguages = Record<string, string | undefined>

/** Picks the labels of the page at `path`: built-in texts, then the user's overrides. */
export function resolveVueReplLabels(
  path: string,
  localeLanguages: VueReplLocaleLanguages,
  options: VueReplLabelOptions,
): VueReplLabels {
  const localeIndex = resolveLocaleIndex(path, Object.keys(localeLanguages))
  const builtIn = localeLanguages[localeIndex]?.toLowerCase().startsWith('zh')
    ? CHINESE_VUE_REPL_LABELS
    : ENGLISH_VUE_REPL_LABELS

  return {
    ...builtIn,
    ...options.labels,
    ...options.localeLabels?.[localeIndex],
  }
}
