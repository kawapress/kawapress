/// <reference path="./types/global-components.d.ts" />
/// <reference path="./types/virtual-modules.d.ts" />

export { withBase, withoutBase } from '../core/base'
export { resolveLocaleIndex } from '../core/locale'
export { OUTLET_NAMES } from '../core/outlet'
export type { OutletItem, OutletName, OutletRegistry } from '../core/outlet'
export type { Route, RouteGuard, RouteHook, Router } from '../core/router'
export { useAppearance } from './appearance'
export type { Appearance } from './appearance'
export { default as ClientOnly } from './components/ClientOnly'
export { default as KawaOutlet } from './components/KawaOutlet.vue'
export { useLocale, usePageData, useSite, useThemeConfig } from './composables'
export type { LocaleContext } from './composables'
export { PLATFORM_DETECTION_SCRIPT, usePlatformAttribute } from './platform'
export { useRoute, useRouter } from './router/injection'
export { default as RouterLink } from './router/RouterLink'
export { default as RouterView } from './router/RouterView'
