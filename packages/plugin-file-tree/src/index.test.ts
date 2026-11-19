import type { TreeSyntaxError } from './index'
import { createMarkdownExit } from 'markdown-exit'
import { describe, expect, it } from 'vitest'
import { renderIcon, resolveFileIconName, resolveFolderIconName } from './icons'
import { fileTreePlugin, installFileTree, parseTree } from './index'

function createMarkdown() {
  const markdown = createMarkdownExit({ html: true })
  installFileTree(markdown)
  return markdown
}

function errorOf(source: string): TreeSyntaxError {
  try {
    parseTree(source)
  }
  catch (error) {
    return error as TreeSyntaxError
  }
  throw new Error('expected a syntax error')
}

describe('parseTree', () => {
  it('reads levels, kinds, comments, highlights, ellipses and collapsing', () => {
    const tree = parseTree([
      'docs/',
      '  .kawapress/',
      '  guide/ (collapsed)',
      '    getting-started.md   # start here',
      '    **routing.md**',
      '    ...',
      '  package.json',
      '',
    ].join('\n'))

    expect(tree).toHaveLength(1)
    const docs = tree[0]!
    expect(docs).toMatchObject({ kind: 'directory', name: 'docs' })
    expect(docs.children.map(child => child.name)).toEqual(['.kawapress', 'guide', 'package.json'])
    expect(docs.children[0]).toMatchObject({ kind: 'directory', children: [] })

    const guide = docs.children[1]!
    expect(guide.collapsed).toBe(true)
    expect(guide.children[0]).toMatchObject({ kind: 'file', comment: 'start here', highlight: false })
    expect(guide.children[1]).toMatchObject({ name: 'routing.md', highlight: true })
    expect(guide.children[2]).toMatchObject({ kind: 'ellipsis' })
  })

  it('accepts tab indentation and highlighted directories', () => {
    const tree = parseTree('**src/**\n\tindex.ts\n\tlib/\n\t\ta.ts')
    expect(tree[0]).toMatchObject({ name: 'src', highlight: true })
    expect(tree[0]!.children[1]!.children[0]!.name).toBe('a.ts')
  })

  it('keeps a "#" inside a name and takes a comment only after whitespace', () => {
    const [node] = parseTree('a#b.md # note # more')
    expect(node).toMatchObject({ name: 'a#b.md', comment: 'note # more' })
  })

  it('reports the line of an odd space indent', () => {
    const error = errorOf('a/\n   b.ts')
    expect(error.line).toBe(2)
    expect(error.detail).toContain('2 spaces')
  })

  it('reports a skipped level', () => {
    expect(errorOf('a/\n    b.ts').line).toBe(2)
  })

  it('reports an indented first entry', () => {
    expect(errorOf('  a.ts').line).toBe(1)
  })

  it('rejects mixing tabs and spaces, counting blank lines', () => {
    const error = errorOf('a/\n  b/\n\n\tc.ts')
    expect(error.line).toBe(4)
    expect(error.detail).toContain('mix')
    expect(errorOf('a/\n \tb.ts').detail).toContain('mixes')
  })

  it('rejects children under a file', () => {
    const error = errorOf('a.ts\n  b.ts')
    expect(error.line).toBe(2)
    expect(error.detail).toContain('file')
  })

  it('rejects a lone comment and a collapsed file', () => {
    expect(errorOf('a/\n  # hello').line).toBe(2)
    expect(errorOf('a.ts (collapsed)').line).toBe(1)
  })
})

describe('icons', () => {
  it('picks icons by file name and extension', () => {
    expect(resolveFileIconName('package.json')).toBe('npm')
    expect(resolveFileIconName('index.ts')).toBe('typescript')
    expect(resolveFileIconName('index.d.ts')).toBe('typescript-def')
    expect(resolveFileIconName('a.test.ts')).toBe('typescript-test')
    expect(resolveFileIconName('App.vue')).toBe('vue')
    expect(resolveFileIconName('routing.md')).toBe('markdown')
    expect(resolveFileIconName('README-zh-CN.md')).toBe('readme')
    expect(resolveFileIconName('tsconfig.build.json')).toBe('typescript-config')
    expect(resolveFileIconName('kawapress.config.ts')).toBe('typescript-config')
    expect(resolveFileIconName('vite.config.ts')).toBe('vite')
    expect(resolveFileIconName('.gitignore')).toBe('git')
  })

  it('falls back to the generic icons', () => {
    expect(resolveFileIconName('mystery.qqq')).toBe('file')
    expect(resolveFileIconName('Noextension')).toBe('file')
    expect(resolveFolderIconName('whatever', false)).toBe('folder')
    expect(resolveFolderIconName('whatever', true)).toBe('folder-open')
  })

  it('picks folder icons by name', () => {
    expect(resolveFolderIconName('src', false)).toBe('folder-src')
    expect(resolveFolderIconName('.github', true)).toBe('folder-github-open')
    expect(resolveFolderIconName('node_modules', false)).toBe('folder-node')
    expect(resolveFolderIconName('test', false)).toBe('folder-tests')
  })

  it('draws on the theme text color instead of the set near-white', () => {
    const svg = renderIcon('file')
    expect(svg).toContain('viewBox="0 0 16 16"')
    expect(svg).toContain('currentColor')
    expect(svg).not.toContain('#cad3f5')
  })
})

describe('tree fence', () => {
  const source = [
    '```tree',
    'docs/',
    '  guide/ (collapsed)',
    '    **routing.md**  # the file to edit',
    '  package.json',
    '  ...',
    '  empty/',
    '```',
    '',
  ].join('\n')

  it('renders a nested list with details, roles and no script', () => {
    const html = createMarkdown().render(source)

    expect(html).toContain('<div class="kawa-file-tree" v-pre>')
    expect(html).toContain('role="tree"')
    expect(html).toContain('role="group"')
    expect(html).toContain('<details open>')
    expect(html).toContain('<details><summary')
    expect(html).toContain('kawa-file-tree__name--highlight')
    expect(html).toContain('<span class="kawa-file-tree__comment">the file to edit</span>')
    expect(html).not.toContain('<script')
  })

  it('does not fold an empty directory', () => {
    const html = createMarkdown().render(source)
    expect(html).toContain('<span class="kawa-file-tree__name">empty/</span>')
    expect(html.match(/<details/g)).toHaveLength(2)
  })

  it('escapes names and comments', () => {
    const html = createMarkdown().render('```tree\n<b>&.md  # {{ x }} <i>\n```\n')
    expect(html).toContain('&lt;b&gt;&amp;.md')
    expect(html).toContain('{{ x }} &lt;i&gt;')
    expect(html).toContain('v-pre')
  })

  it('leaves other fences to the renderer that was there before', () => {
    const html = createMarkdown().render('```ts\nconst a = 1\n```\n```treex\nx\n```\n')
    expect(html).toContain('<pre>')
    expect(html).not.toContain('kawa-file-tree')
  })

  it('names the page and the line when the tree is wrong', () => {
    const markdown = createMarkdown()
    const page = '# Title\n\n```tree\na/\n   b.ts\n```\n'
    expect(() => markdown.render(page, { path: '/guide/' })).toThrow(
      'KawaPress file tree in /guide/: tree line 2 (page line 5): indentation is 3 spaces',
    )
  })

  it('matches the HTML snapshot', () => {
    expect(createMarkdown().render(source).replace(/<svg[\s\S]*?<\/svg>/g, '<svg/>')).toMatchSnapshot()
  })
})

describe('file tree plugin', () => {
  it('is a generator plugin named after the package', () => {
    expect(fileTreePlugin().name).toBe('@kawapress/plugin-file-tree')
  })
})
