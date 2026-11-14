import { attrs as attrsPlugin } from '@mdit/plugin-attrs'
import { useMarkdownItPlugin } from 'kawapress'
import { createMarkdownExit } from 'markdown-exit'
import anchorPlugin from 'markdown-it-anchor'
import { describe, expect, it } from 'vitest'
import { installToc } from './toc'

function render(source: string, level?: number[]): string {
  const markdown = createMarkdownExit({ html: true })
  useMarkdownItPlugin(markdown, attrsPlugin, { allowed: ['id'], rule: ['heading'] })
  useMarkdownItPlugin(markdown, anchorPlugin, { level: [1, 2, 3, 4, 5, 6] })
  installToc(markdown, level ? { level } : {})
  return markdown.render(source)
}

function toc(html: string): string {
  return html.match(/<nav class="kawa-toc">.*<\/nav>/)?.[0] ?? ''
}

describe('table of contents', () => {
  it('lists the h2 and h3 headings, nested, wherever the marker sits', () => {
    const html = render(`# Page

[[toc]]

## Install

### With pnpm

#### Deep

## Usage
`)

    expect(toc(html)).toBe(
      '<nav class="kawa-toc"><ul>'
      + '<li><a href="#install">Install</a><ul><li><a href="#with-pnpm">With pnpm</a></li></ul></li>'
      + '<li><a href="#usage">Usage</a></li>'
      + '</ul></nav>',
    )
    expect(html).not.toContain('[[toc]]')
  })

  it('uses the custom ID and the plain-text heading title', () => {
    const html = render(`[[TOC]]

## The **API** <Badge text="beta" /> {#api}

## \`<script>\` tags
`)

    const scriptId = html.match(/<h2 id="([^"]+)" tabindex="-1"><code>/)?.[1]
    expect(toc(html)).toBe(
      '<nav class="kawa-toc"><ul>'
      + '<li><a href="#api">The API</a></li>'
      + `<li><a href="#${scriptId}">&lt;script&gt; tags</a></li>`
      + '</ul></nav>',
    )
  })

  it('follows the level option', () => {
    const html = render('[[toc]]\n\n## Two\n\n### Three\n', [2])
    expect(toc(html)).toBe('<nav class="kawa-toc"><ul><li><a href="#two">Two</a></li></ul></nav>')
  })

  it('leaves out headings inside block quotes and containers', () => {
    const html = render('[[toc]]\n\n## Kept\n\n> ## Quoted\n')
    expect(toc(html)).toBe('<nav class="kawa-toc"><ul><li><a href="#kept">Kept</a></li></ul></nav>')
  })

  it('renders nothing for a page without matching headings', () => {
    expect(render('[[toc]]\n\nJust text.\n')).toBe('<p>Just text.</p>\n')
  })

  it('keeps the marker as text when it is not alone on its line or is indented code', () => {
    expect(render('See [[toc]] here.\n')).toBe('<p>See [[toc]] here.</p>\n')
    expect(render('    [[toc]]\n')).toBe('<pre><code>[[toc]]\n</code></pre>\n')
  })

  it('keeps the marker inside a fence as written', () => {
    expect(render('```md\n[[toc]]\n```\n')).toContain('[[toc]]')
  })
})
