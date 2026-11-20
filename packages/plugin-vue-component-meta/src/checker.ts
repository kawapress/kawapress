import type { ComponentMetaChecker } from 'vue-component-meta'
import type { RawMeta } from './normalize'
import type { ComponentDoc } from './types'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { normalizeComponentMeta } from './normalize'

const require = createRequire(import.meta.url)

/**
 * Node-only: this module reaches `vue-component-meta` and TypeScript. Only the
 * Vite plugin imports it, and only inside the generator, so none of it can end
 * up in a client bundle.
 */

export interface ComponentDocServiceOptions {
  /** Absolute path of the site root. */
  root: string
  /** tsconfig for every component, relative to `root`. Default: the nearest one above each component. */
  tsconfig?: string
  /** Type names the checker does not expand. */
  ignoreTypes?: string[]
  /** Called for problems that do not stop the build, such as generic components. */
  warn?: (message: string) => void
}

type CheckerModule = typeof import('vue-component-meta')

/** Config for components that no tsconfig covers. */
const FALLBACK_COMPILER_OPTIONS = {
  target: 'ESNext',
  module: 'ESNext',
  moduleResolution: 'bundler',
  strict: true,
  skipLibCheck: true,
  jsx: 'preserve',
} as const

const FALLBACK_KEY = '\0fallback'
const GENERIC_ATTRIBUTE_RE = /<script\s[^>]*\bgeneric\s*=/
const PROPS_JSDOC_RE = /\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*(?:export\s+)?(?:interface|type)\s+\w*Props\b/
const NAME_OPTION_RE = /\bname\s*:\s*['"]([\w-]+)['"]/

export class ComponentDocService {
  private readonly checkers = new Map<string, Promise<ComponentMetaChecker>>()
  private readonly tsconfigByDirectory = new Map<string, string | undefined>()
  private readonly docs = new Map<string, ComponentDoc>()
  private readonly warned = new Set<string>()
  private checkerModule: Promise<CheckerModule> | undefined

  constructor(private readonly options: ComponentDocServiceOptions) {}

  /** Reads one component. The first call loads the checker, which takes about 0.3 seconds. */
  async getDoc(file: string): Promise<ComponentDoc> {
    const cached = this.docs.get(file)
    if (cached) {
      return cached
    }

    const source = readFileSync(file, 'utf8')
    const checker = await this.getChecker(file)
    // Lets the checker analyze a file that the tsconfig does not list.
    checker.updateFile(file, source)

    const generic = GENERIC_ATTRIBUTE_RE.test(source)
    const raw = checker.getComponentMeta(file) as unknown as RawMeta
    const doc = normalizeComponentMeta(raw, {
      fallbackName: readComponentName(source, file),
      generic,
      description: readPropsDescription(source),
    })
    fillEventDescriptions(doc, source)

    if (!canResolveVue(file)) {
      this.warnOnce(
        `${file}\0vue`,
        `KawaPress Vue Component Meta: \`vue\` cannot be resolved from ${dirname(file)}, so the types of defineProps, defineEmits and defineSlots are unknown and ${file} shows no API. Install vue in the package that holds the component.`,
      )
    }
    if (doc.unsupported === 'generic') {
      this.warnOnce(
        file,
        `KawaPress Vue Component Meta: ${file} is a generic component (<script setup generic>), and vue-component-meta cannot read its props. The API table shows a notice instead.`,
      )
    }
    this.docs.set(file, doc)
    return doc
  }

  /** The file changed on disk: the checker takes the new text and cached docs are dropped. */
  invalidateFile(file: string, text?: string): void {
    this.docs.clear()
    if (text === undefined && !existsSync(file)) {
      return
    }
    const content = text ?? readFileSync(file, 'utf8')
    for (const checker of this.checkers.values()) {
      void checker.then(instance => instance.updateFile(file, content))
    }
  }

  /** A file was added or removed, so the checkers read their projects again. */
  reload(): void {
    this.docs.clear()
    for (const checker of this.checkers.values()) {
      void checker.then(instance => instance.reload())
    }
  }

  deleteFile(file: string): void {
    this.docs.clear()
    for (const checker of this.checkers.values()) {
      void checker.then(instance => instance.deleteFile(file))
    }
  }

  private async getChecker(file: string): Promise<ComponentMetaChecker> {
    const tsconfig = this.findTsconfig(file)
    const key = tsconfig ?? FALLBACK_KEY
    let checker = this.checkers.get(key)
    if (!checker) {
      checker = this.createChecker(tsconfig)
      this.checkers.set(key, checker)
    }
    return checker
  }

  private async createChecker(tsconfig: string | undefined): Promise<ComponentMetaChecker> {
    const { createChecker, createCheckerByJson } = await this.loadChecker()
    const schema = { ignore: this.options.ignoreTypes ?? [] }
    return tsconfig
      ? createChecker(tsconfig, { schema })
      : createCheckerByJson(
          this.options.root,
          { compilerOptions: FALLBACK_COMPILER_OPTIONS, files: [] },
          { schema },
        )
  }

  private loadChecker(): Promise<CheckerModule> {
    // Loaded on demand, so the generator pays for TypeScript only when a page asks for it.
    // `require`, not `import()`: the site config, and this module with it, is loaded by a
    // Vite module runner that is closed by the time pages are built.
    this.checkerModule ??= Promise.resolve(require('vue-component-meta') as CheckerModule)
    return this.checkerModule
  }

  private findTsconfig(file: string): string | undefined {
    if (this.options.tsconfig) {
      return resolve(this.options.root, this.options.tsconfig)
    }

    const start = dirname(file)
    if (this.tsconfigByDirectory.has(start)) {
      return this.tsconfigByDirectory.get(start)
    }
    let directory = start
    while (true) {
      const candidate = join(directory, 'tsconfig.json')
      if (existsSync(candidate)) {
        this.tsconfigByDirectory.set(start, candidate)
        return candidate
      }
      const parent = dirname(directory)
      if (parent === directory) {
        break
      }
      directory = parent
    }
    this.tsconfigByDirectory.set(start, undefined)
    return undefined
  }

  private warnOnce(key: string, message: string): void {
    if (!this.warned.has(key)) {
      this.warned.add(key)
      this.options.warn?.(message)
    }
  }
}

function readComponentName(source: string, file: string): string {
  const fromOption = NAME_OPTION_RE.exec(
    /defineOptions\(\s*\{[^}]*\}/.exec(source)?.[0] ?? '',
  )?.[1]
  return fromOption ?? basename(file, extname(file))
}

function readPropsDescription(source: string): string {
  const block = PROPS_JSDOC_RE.exec(source)?.[1]
  return block ? jsdocText(block) : ''
}

/**
 * vue-component-meta 3.3 drops the JSDoc of emits, whichever way they are typed.
 * Read it from the source instead: the comment right before `name: [...]` or
 * `(e: 'name', ...)`.
 */
function fillEventDescriptions(doc: ComponentDoc, source: string): void {
  for (const event of doc.events) {
    if (event.description) {
      continue
    }
    const name = event.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`/\\*\\*((?:(?!\\*/)[\\s\\S])*)\\*/\\s*(?:['"]?${name}['"]?\\??\\s*:|\\(\\s*\\w+\\s*:\\s*['"]${name}['"])`)
    const block = pattern.exec(source)?.[1]
    if (block) {
      event.description = jsdocText(block)
    }
  }
}

function jsdocText(block: string): string {
  return block
    .split('\n')
    .map(line => line.replace(/^\s*\*? ?/, '').trimEnd())
    .filter(line => !line.startsWith('@'))
    .join('\n')
    .trim()
}

/** The checker reads the macro types from `vue`; without it every table comes out empty. */
function canResolveVue(file: string): boolean {
  try {
    createRequire(file).resolve('vue/package.json')
    return true
  }
  catch {
    return false
  }
}
