import matter from 'gray-matter'
import { normalizeFrontmatterSource } from '../core/frontmatter'

/**
 * Writes `frontmatter` into the frontmatter of a Markdown source. A key given
 * here replaces the same key the Markdown has; the Markdown's JSON or YAML
 * frontmatter is read either way. Without `frontmatter` the source is returned
 * untouched.
 */
export function mergeFrontmatter(
  markdown: string,
  frontmatter: Readonly<Record<string, unknown>> | undefined,
): string {
  if (frontmatter === undefined || Object.keys(frontmatter).length === 0) {
    return markdown
  }
  // Passing options keeps gray-matter from sharing its cached result.
  const parsed = matter(normalizeFrontmatterSource(markdown), {})
  return matter.stringify(parsed.content, { ...parsed.data, ...frontmatter })
}
