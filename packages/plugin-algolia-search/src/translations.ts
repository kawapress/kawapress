const BUTTON_TEXT = {
  en: 'Search',
  zh: '搜索',
} as const

/**
 * Text of the search button: the `translations.button.buttonText` the site
 * author wrote, otherwise a built-in label in the language of the page.
 */
export function resolveButtonText(
  translations: Record<string, unknown> | undefined,
  lang: string | undefined,
): string {
  const button = translations?.button
  const text = typeof button === 'object' && button !== null
    ? (button as { buttonText?: unknown }).buttonText
    : undefined
  if (typeof text === 'string' && text.trim() !== '') {
    return text
  }
  return (lang ?? '').toLowerCase().startsWith('zh') ? BUTTON_TEXT.zh : BUTTON_TEXT.en
}
