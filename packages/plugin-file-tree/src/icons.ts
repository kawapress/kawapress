import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const ICON_SET = '@iconify-json/catppuccin/icons.json'
/** The set draws neutral strokes in this near-white; the theme text color replaces it. */
const NEUTRAL_COLOR = '#cad3f5'

interface IconifyIcon {
  body: string
  width?: number
  height?: number
}

interface IconifySet {
  icons: Record<string, IconifyIcon>
  aliases?: Record<string, { parent: string }>
  width?: number
  height?: number
}

let iconSet: IconifySet | undefined

function loadIconSet(): IconifySet {
  if (!iconSet) {
    const file = createRequire(import.meta.url).resolve(ICON_SET)
    iconSet = JSON.parse(readFileSync(file, 'utf8')) as IconifySet
  }
  return iconSet
}

/** Exact file names, compared in lower case. */
const FILE_NAMES: Record<string, string> = {
  'package.json': 'npm',
  'package-lock.json': 'npm-lock',
  'pnpm-lock.yaml': 'pnpm-lock',
  'pnpm-workspace.yaml': 'pnpm',
  'yarn.lock': 'yarn-lock',
  'bun.lock': 'bun-lock',
  'bun.lockb': 'bun-lock',
  'cargo.lock': 'cargo-lock',
  'cargo.toml': 'cargo',
  'go.mod': 'go-mod',
  '.gitignore': 'git',
  '.gitattributes': 'git',
  '.gitmodules': 'git',
  '.npmignore': 'npm-ignore',
  '.npmrc': 'npm',
  '.nvmrc': 'config',
  '.editorconfig': 'editorconfig',
  '.eslintignore': 'eslint-ignore',
  '.prettierignore': 'prettier-ignore',
  '.dockerignore': 'docker-ignore',
  '.browserslistrc': 'browserslist',
  'dockerfile': 'docker',
  'makefile': 'makefile',
  'justfile': 'just',
  'codeowners': 'codeowners',
  'license': 'license',
  'licence': 'license',
  'changelog': 'changelog',
  'readme': 'readme',
  'contributing': 'contributing',
  'code_of_conduct': 'code-of-conduct',
  'security': 'security',
  'robots.txt': 'robots',
  'humans.txt': 'humans',
  'favicon.ico': 'favicon',
  'tsconfig.json': 'typescript-config',
  'jsconfig.json': 'javascript-config',
}

/** File names that start with a prefix and may carry any extension. */
const FILE_PREFIXES: [prefix: string, icon: string][] = [
  ['readme', 'readme'],
  ['license', 'license'],
  ['licence', 'license'],
  ['changelog', 'changelog'],
  ['contributing', 'contributing'],
  ['code_of_conduct', 'code-of-conduct'],
  ['security.', 'security'],
  ['tsconfig.', 'typescript-config'],
  ['jsconfig.', 'javascript-config'],
  ['eslint.config.', 'eslint'],
  ['.eslintrc', 'eslint'],
  ['.prettierrc', 'prettier'],
  ['prettier.config.', 'prettier'],
  ['vite.config.', 'vite'],
  ['vitest.config.', 'vitest'],
  ['nuxt.config.', 'nuxt'],
  ['next.config.', 'next'],
  ['astro.config.', 'astro-config'],
  ['svelte.config.', 'svelte-config'],
  ['vue.config.', 'vue-config'],
  ['tailwind.config.', 'tailwind'],
  ['uno.config.', 'unocss'],
  ['postcss.config.', 'postcss'],
  ['rollup.config.', 'rollup'],
  ['webpack.config.', 'webpack'],
  ['jest.config.', 'jest'],
  ['playwright.config.', 'playwright'],
  ['wrangler.', 'wrangler'],
  ['docker-compose', 'docker-compose'],
  ['dockerfile', 'docker'],
  ['.env', 'env'],
]

/** Extensions, longest compound first so `d.ts` wins over `ts`. */
const EXTENSIONS: Record<string, string> = {
  'd.ts': 'typescript-def',
  'd.mts': 'typescript-def',
  'd.cts': 'typescript-def',
  'test.ts': 'typescript-test',
  'spec.ts': 'typescript-test',
  'test.tsx': 'typescript-test',
  'spec.tsx': 'typescript-test',
  'test.js': 'javascript-test',
  'spec.js': 'javascript-test',
  'ts': 'typescript',
  'mts': 'typescript',
  'cts': 'typescript',
  'tsx': 'typescript-react',
  'js': 'javascript',
  'mjs': 'javascript',
  'cjs': 'javascript',
  'jsx': 'javascript-react',
  'vue': 'vue',
  'astro': 'astro',
  'svelte': 'svelte',
  'md': 'markdown',
  'markdown': 'markdown',
  'mdx': 'markdown-mdx',
  'json': 'json',
  'jsonc': 'json',
  'json5': 'json',
  'css': 'css',
  'scss': 'sass',
  'sass': 'sass',
  'less': 'less',
  'html': 'html',
  'htm': 'html',
  'xml': 'xml',
  'yaml': 'yaml',
  'yml': 'yaml',
  'toml': 'toml',
  'csv': 'csv',
  'txt': 'text',
  'log': 'log',
  'lock': 'lock',
  'env': 'env',
  'svg': 'svg',
  'png': 'image',
  'jpg': 'image',
  'jpeg': 'image',
  'gif': 'image',
  'webp': 'image',
  'avif': 'image',
  'bmp': 'image',
  'ico': 'image',
  'pdf': 'pdf',
  'zip': 'zip',
  'gz': 'zip',
  'tgz': 'zip',
  'tar': 'zip',
  'mp3': 'audio',
  'wav': 'audio',
  'flac': 'audio',
  'mp4': 'video',
  'mov': 'video',
  'webm': 'video',
  'woff': 'font',
  'woff2': 'font',
  'ttf': 'font',
  'otf': 'font',
  'wasm': 'web-assembly',
  'sh': 'bash',
  'bash': 'bash',
  'zsh': 'bash',
  'ps1': 'powershell',
  'py': 'python',
  'rs': 'rust',
  'go': 'go',
  'java': 'java',
  'kt': 'kotlin',
  'swift': 'swift',
  'rb': 'ruby',
  'php': 'php',
  'lua': 'lua',
  'zig': 'zig',
  'c': 'c',
  'h': 'c-header',
  'cpp': 'cpp',
  'hpp': 'cpp-header',
  'cs': 'csharp',
  'sql': 'database',
  'graphql': 'graphql',
  'gql': 'graphql',
  'proto': 'proto',
  'diff': 'diff',
  'patch': 'diff',
  'mmd': 'mermaid',
  'mermaid': 'mermaid',
}

/** Directory names (without a leading dot, lower case) that share an icon. */
const FOLDER_ALIASES: Record<string, string> = {
  node_modules: 'node',
  doc: 'docs',
  documentation: 'docs',
  test: 'tests',
  __tests__: 'tests',
  spec: 'tests',
  e2e: 'tests',
  script: 'scripts',
  component: 'components',
  util: 'utils',
  helpers: 'utils',
  asset: 'assets',
  image: 'images',
  img: 'images',
  style: 'styles',
  css: 'styles',
  type: 'types',
  typings: 'types',
  bench: 'benchmark',
  benchmarks: 'benchmark',
  build: 'dist',
  out: 'dist',
  output: 'dist',
  configs: 'config',
  i18n: 'locales',
  lang: 'locales',
  page: 'views',
  pages: 'views',
  view: 'views',
  plugin: 'plugins',
  hook: 'hooks',
  example: 'examples',
  demo: 'examples',
  demos: 'examples',
  template: 'templates',
  theme: 'themes',
  font: 'fonts',
  common: 'shared',
  mock: 'mocks',
  __mocks__: 'mocks',
  db: 'database',
  workflow: 'workflows',
  route: 'routes',
  package: 'packages',
  layout: 'layouts',
}

function hasIcon(name: string): boolean {
  const set = loadIconSet()
  return name in set.icons || name in (set.aliases ?? {})
}

function pick(...names: (string | undefined)[]): string | undefined {
  return names.find((name): name is string => name !== undefined && hasIcon(name))
}

/** Catppuccin icon name for a file name, `file` when nothing fits. */
export function resolveFileIconName(fileName: string): string {
  const name = fileName.toLowerCase()
  const byPrefix = FILE_PREFIXES.find(([prefix]) => name.startsWith(prefix))?.[1]

  const parts = name.split('.')
  const extensions: string[] = []
  // `a.test.ts` → ['test.ts', 'ts']; a leading dot is not an extension.
  for (let start = name.startsWith('.') ? 2 : 1; start < parts.length; start++) {
    extensions.push(parts.slice(start).join('.'))
  }
  const byExtension = extensions
    .map(extension => EXTENSIONS[extension])
    .find(icon => icon !== undefined)
  const byConfig = /\.config\.[cm]?ts$/.test(name)
    ? 'typescript-config'
    : /\.config\.[cm]?js$/.test(name) ? 'javascript-config' : undefined

  return pick(FILE_NAMES[name], byPrefix, byConfig, byExtension) ?? 'file'
}

/** Catppuccin icon name for a directory, `folder` when nothing fits. */
export function resolveFolderIconName(directoryName: string, open: boolean): string {
  const bare = directoryName.toLowerCase().replace(/^\./, '')
  const suffix = open ? '-open' : ''
  return pick(
    `folder-${FOLDER_ALIASES[bare] ?? bare}${suffix}`,
    `folder-${bare}${suffix}`,
  ) ?? (open ? 'folder-open' : 'folder')
}

/** Inline SVG markup for a Catppuccin icon name, drawn at the surrounding font size. */
export function renderIcon(iconName: string): string {
  const set = loadIconSet()
  const icon = set.icons[set.aliases?.[iconName]?.parent ?? iconName] ?? set.icons.file!
  const width = icon.width ?? set.width ?? 16
  const height = icon.height ?? set.height ?? 16
  const body = icon.body.replaceAll(NEUTRAL_COLOR, 'currentColor')
  return `<svg class="kawa-file-tree__icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">${body}</svg>`
}
