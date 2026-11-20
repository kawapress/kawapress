export const PLUGIN_NAME = '@kawapress/plugin-vue-component-demo'
export const COMPONENT_NAME = 'KawaComponentDemo'
export const DEFAULT_TAG = 'ComponentDemo'
/** Query that turns a demo file into its highlighted source. */
export const SOURCE_QUERY = 'component-demo-source'
/** Query that turns a demo file into a component that only loads in the browser. */
export const CLIENT_QUERY = 'component-demo-client'
export const PLAYGROUND_NAME = 'KawaComponentPlayground'
export const PROPS_TABLE_NAME = 'KawaDemoPropsTable'
/** The query of the meta plugin that turns a component file into its `ComponentDoc`. */
export const DOC_QUERY = 'component-doc'
export const META_PLUGIN_PACKAGE = '@kawapress/plugin-vue-component-meta'
/**
 * Name of the meta plugin's Vite plugin. The site config does not expose the
 * list of KawaPress plugins, so the Vite plugin list is what tells that the
 * meta plugin is installed.
 */
export const META_VITE_PLUGIN_NAME = 'kawapress:vue-component-meta'
