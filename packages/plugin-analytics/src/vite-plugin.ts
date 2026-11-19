import type { Plugin } from 'vite'
import { stringifyJson } from 'kawapress'

export const ANALYTICS_OPTIONS_MODULE_ID = 'virtual:kawapress-analytics-options'

const RESOLVED_MODULE_ID = `\0${ANALYTICS_OPTIONS_MODULE_ID}`

/** What the browser needs to know: whether Google page views must be sent. */
export interface AnalyticsRuntimeOptions {
  google: boolean
}

export function analyticsOptionsPlugin(options: AnalyticsRuntimeOptions): Plugin {
  return {
    name: 'kawapress:analytics-options',
    resolveId(id) {
      if (id === ANALYTICS_OPTIONS_MODULE_ID) {
        return RESOLVED_MODULE_ID
      }
    },
    load(id) {
      if (id !== RESOLVED_MODULE_ID) {
        return
      }
      return `export default ${stringifyJson(options, {
        label: 'options of @kawapress/plugin-analytics',
        path: 'analyticsPlugin',
      })}`
    },
  }
}
