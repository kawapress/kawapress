import type { Component } from 'vue'
import type { NagiPageLayout } from './frontmatter'
import { camelize, capitalize } from 'vue'
import { isBuiltInLayout } from './frontmatter'

/**
 * The globally registered component a custom `layout` names, looked up the way
 * a template resolves a tag: as written, camelCase, then PascalCase. Built-in
 * layouts, `false` and a name without a component give `undefined`.
 */
export function resolveCustomLayout(
  layout: NagiPageLayout,
  components: Readonly<Record<string, Component>>,
): Component | undefined {
  if (layout === false || isBuiltInLayout(layout)) {
    return undefined
  }
  const camelized = camelize(layout)
  return components[layout]
    ?? components[camelized]
    ?? components[capitalize(camelized)]
}
