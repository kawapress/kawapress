import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { expandMarkdownSource } from './markdown-source'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'kawapress-markdown-source-'))
  await mkdir(join(root, 'guide'), { recursive: true })
  await mkdir(join(root, 'snippets'), { recursive: true })
})

afterEach(async () => {
  await rm(root, { force: true, recursive: true })
})

function expand(source: string, page = 'guide/page.md') {
  return expandMarkdownSource(source, { file: join(root, page), sourceRoot: root })
}

describe('expandMarkdownSource: includes', () => {
  it('writes out an included Markdown file without its frontmatter', async () => {
    await writeFile(join(root, 'guide/part.md'), '---\ntitle: Part\n---\n## Shared\n\nShared text.\n')

    const result = expand('# Page\n\n<!--@include: ./part.md-->\n\nAfter.\n')

    expect(result.source).toBe('# Page\n\n## Shared\n\nShared text.\n\nAfter.\n')
    expect(result.dependencies).toEqual([join(root, 'guide/part.md')])
  })

  it('reads `@/` paths from the source directory and nests includes', async () => {
    await writeFile(join(root, 'snippets/outer.md'), 'Outer <!--@include: ./inner.md--> end')
    await writeFile(join(root, 'snippets/inner.md'), 'inner\n')

    const result = expand('<!-- @include: @/snippets/outer.md -->\n')

    expect(result.source).toBe('Outer inner end\n')
    expect(result.dependencies).toEqual([
      join(root, 'snippets/outer.md'),
      join(root, 'snippets/inner.md'),
    ])
  })

  it('keeps only a region or a line range', async () => {
    await writeFile(join(root, 'guide/part.md'), [
      'line 1',
      '<!-- #region usage -->',
      'usage text',
      '<!-- #endregion usage -->',
      'line 5',
      'line 6',
    ].join('\n'))

    expect(expand('<!--@include: ./part.md#usage-->').source).toBe('usage text')
    expect(expand('<!--@include: ./part.md{5,6}-->').source).toBe('line 5\nline 6')
    expect(expand('<!--@include: ./part.md{,1}-->').source).toBe('line 1')
  })

  it('indents every included line like the directive', async () => {
    await writeFile(join(root, 'guide/part.md'), '- one\n- two\n')

    expect(expand('- list\n  <!--@include: ./part.md-->').source)
      .toBe('- list\n  - one\n  - two')
  })

  it('leaves directives inside fenced code blocks as written', async () => {
    const source = '````md\n<!--@include: ./missing.md-->\n<<< ./missing.ts\n````\n'

    expect(expand(source).source).toBe(source)
  })

  it('names the page line when an included file is missing', () => {
    expect(() => expand('# Page\n\n<!--@include: ./missing.md-->'))
      .toThrow(`${join(root, 'guide/page.md')}:3`)
  })

  it('refuses a file that includes itself', async () => {
    await writeFile(join(root, 'guide/loop.md'), '<!--@include: ./loop.md-->')

    expect(() => expand('<!--@include: ./loop.md-->')).toThrow('includes itself')
  })

  it('maps every expanded line to the page line it comes from', async () => {
    await writeFile(join(root, 'guide/part.md'), 'a\nb\nc\n')

    const result = expand('top\n<!--@include: ./part.md-->\nbottom')

    expect(result.source).toBe('top\na\nb\nc\nbottom')
    expect(result.lineOrigins).toEqual([1, 2, 2, 2, 3])
  })
})

describe('expandMarkdownSource: code snippets', () => {
  it('turns `<<<` into a fenced code block in the language of the file', async () => {
    await writeFile(join(root, 'snippets/hello.ts'), 'export const hello = 1\n')

    const result = expand('<<< @/snippets/hello.ts\n')

    expect(result.source).toBe('```ts [hello.ts]\nexport const hello = 1\n```\n')
    expect(result.dependencies).toEqual([join(root, 'snippets/hello.ts')])
  })

  it('keeps highlight lines, language, attributes and title', async () => {
    await writeFile(join(root, 'guide/run.sh'), 'echo 1\necho 2\n')

    expect(expand('<<< ./run.sh{2 bash:line-numbers} [Run it]').source)
      .toBe('```bash:line-numbers {2} [Run it]\necho 1\necho 2\n```')
    expect(expand('<<< ./run.sh{1}').source)
      .toBe('```sh {1} [run.sh]\necho 1\necho 2\n```')
  })

  it('shows one region without its markers and dedents it', async () => {
    await writeFile(join(root, 'snippets/config.ts'), [
      'export default {',
      '  // #region plugins',
      '  plugins: [',
      '    // #region inner',
      '    search(),',
      '    // #endregion inner',
      '  ],',
      '  // #endregion plugins',
      '}',
    ].join('\n'))

    expect(expand('<<< @/snippets/config.ts#plugins').source)
      .toBe('```ts [config.ts]\nplugins: [\n  search(),\n],\n```')
  })

  it('uses a longer fence when the snippet holds a fence', async () => {
    await writeFile(join(root, 'snippets/doc.md'), '```js\nx\n```\n')

    expect(expand('<<< @/snippets/doc.md').source)
      .toBe('````md [doc.md]\n```js\nx\n```\n````')
  })

  it('names the page line when the snippet or its region is missing', async () => {
    await writeFile(join(root, 'snippets/a.ts'), 'a\n')

    expect(() => expand('\n<<< ./missing.ts')).toThrow(`${join(root, 'guide/page.md')}:2`)
    expect(() => expand('<<< @/snippets/a.ts#nope')).toThrow('region "nope"')
  })

  it('reads a snippet from inside an included file', async () => {
    await writeFile(join(root, 'snippets/a.ts'), 'const a = 1\n')
    await writeFile(join(root, 'snippets/part.md'), 'Code:\n\n<<< ./a.ts\n')

    expect(expand('<!--@include: @/snippets/part.md-->').source)
      .toBe('Code:\n\n```ts [a.ts]\nconst a = 1\n```')
  })
})
