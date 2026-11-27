import { describe, expect, it } from 'vitest'
import { fillRouteTemplate, parseFileTemplate, parseRouteTemplate } from './page-template'

const LABEL = 'pages("/x") of plugin "p"'

describe('parseRouteTemplate', () => {
  it('reads single and rest parameters', () => {
    expect(parseRouteTemplate('/notes/[...slug]', LABEL).params).toEqual([{ name: 'slug', rest: true }])
    expect(parseRouteTemplate('/[lang]/pkg/[name]/', LABEL).params).toEqual([
      { name: 'lang', rest: false },
      { name: 'name', rest: false },
    ])
    expect(parseRouteTemplate('/changelog/', LABEL).params).toEqual([])
  })

  it.each([
    ['a route without a leading slash', 'api', 'must be a string that starts with a single "/"'],
    ['a route with two leading slashes', '//api', 'must be a string that starts with a single "/"'],
    ['a parameter next to literal text', '/v[version]', 'must take a whole segment'],
    ['a parameter that is not an identifier', '/[a-b]', '"a-b" is not a valid parameter name'],
    ['a repeated parameter name', '/[a]/[...a]', 'the parameter "a" is used more than once'],
    ['a reserved parameter name', '/[markdown]', '"markdown" cannot be a parameter name'],
    ['an empty segment', '/a//b', 'has an empty segment'],
  ])('rejects %s', (_name, route, message) => {
    expect(() => parseRouteTemplate(route, LABEL)).toThrow(`KawaPress: ${LABEL}: `)
    expect(() => parseRouteTemplate(route, LABEL)).toThrow(message)
  })
})

describe('fillRouteTemplate', () => {
  const where = 'where'

  it('fills the parameters and keeps the trailing slash', () => {
    expect(fillRouteTemplate(parseRouteTemplate('/[a]/x/[...b]/', LABEL), { a: '1', b: 'p/q' }, where)).toBe('/1/x/p/q/')
  })

  it.each([
    ['a missing value', {}, 'must be a non-empty string without "/", got nothing'],
    ['an empty value', { a: '' }, 'got ""'],
    ['a value with a slash', { a: 'x/y' }, 'got "x/y"'],
    ['a number', { a: 1 }, 'got 1'],
  ])('rejects %s for a single parameter', (_name, values, message) => {
    expect(() => fillRouteTemplate(parseRouteTemplate('/[a]', LABEL), values, where)).toThrow(message)
  })

  it.each(['/x', 'x/', 'x//y', ''])('rejects the rest value %j', (value) => {
    expect(() => fillRouteTemplate(parseRouteTemplate('/[...a]', LABEL), { a: value }, where)).toThrow(
      'must be one or more path segments, without a leading or trailing "/"',
    )
  })
})

describe('parseFileTemplate', () => {
  const root = '/site/docs'

  it('reads parameter values out of matching paths', () => {
    const route = parseRouteTemplate('/packages/[name]', LABEL)
    const template = parseFileTemplate('../packages/[name]/README.md', root, route, LABEL)

    expect(template.glob).toBe('/site/packages/*/README.md')
    expect(template.baseDirectory).toBe('/site/packages')
    expect(template.match('/site/packages/core/README.md')).toEqual({ name: 'core' })
    expect(template.match('/site/packages/core/src/README.md')).toBeUndefined()
  })

  it('lets a rest parameter take several segments and a file suffix', () => {
    const route = parseRouteTemplate('/notes/[...slug]', LABEL)
    const template = parseFileTemplate('notes/[...slug].md', root, route, LABEL)

    expect(template.glob).toBe('/site/docs/notes/**/*.md')
    expect(template.match('/site/docs/notes/a.md')).toEqual({ slug: 'a' })
    expect(template.match('/site/docs/notes/guide/index.md')).toEqual({ slug: 'guide/index' })
  })

  it('takes an absolute template as it is', () => {
    const route = parseRouteTemplate('/readme', LABEL)
    const template = parseFileTemplate('/elsewhere/README.md', root, route, LABEL)

    expect(template.match('/elsewhere/README.md')).toEqual({})
    expect(template.baseDirectory).toBe('/elsewhere/README.md')
  })

  it('names both parameter lists when they differ', () => {
    const route = parseRouteTemplate('/p/[name]', LABEL)

    expect(() => parseFileTemplate('x/[id].md', root, route, LABEL)).toThrow(
      `KawaPress: ${LABEL}: the route has the parameters [name] but the file template "x/[id].md" has [id]. They must be the same.`,
    )
    expect(() => parseFileTemplate('x/y.md', root, route, LABEL)).toThrow('has none')
    expect(() => parseFileTemplate('x/[...name].md', root, route, LABEL)).toThrow('has [...name]')
  })

  it('rejects a rest parameter that does not start its segment', () => {
    const route = parseRouteTemplate('/p/[...name]', LABEL)

    expect(() => parseFileTemplate('x/v[...name].md', root, route, LABEL)).toThrow('must start its path segment')
  })
})
