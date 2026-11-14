import type { Page } from '@playwright/test'

/** One search hit, in the shape the DocSearch crawler stores. */
export interface AlgoliaStubHit {
  title: string
  url: string
}

/**
 * Answers every DocSearch query with the given hits and records the request
 * bodies, so a spec can run the real DocSearch modal without the network.
 */
export async function stubAlgolia(page: Page, hits: AlgoliaStubHit[]): Promise<unknown[]> {
  const requests: unknown[] = []
  await page.route(/https:\/\/[\w-]+(?:-dsn\.algolia\.net|\.algolianet\.com|\.algolia\.net)\//, async (route) => {
    const body = route.request().postDataJSON() as { requests?: { indexName: string, query?: string }[] } | null
    requests.push(body)
    const queries = body?.requests ?? []
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        results: queries.map(query => ({
          hits: query.query ? hits.map(toHit) : [],
          nbHits: query.query ? hits.length : 0,
          page: 0,
          nbPages: 1,
          hitsPerPage: 20,
          processingTimeMS: 1,
          exhaustiveNbHits: true,
          query: query.query ?? '',
          params: '',
          index: query.indexName,
        })),
      }),
    })
  })
  return requests
}

function toHit(hit: AlgoliaStubHit, position: number): Record<string, unknown> {
  const hierarchy = {
    lvl0: 'Documentation',
    lvl1: hit.title,
    lvl2: null,
    lvl3: null,
    lvl4: null,
    lvl5: null,
    lvl6: null,
  }
  return {
    objectID: `hit-${position}`,
    type: 'lvl1',
    url: hit.url,
    content: null,
    hierarchy,
    _highlightResult: {
      hierarchy: {
        lvl0: { value: hierarchy.lvl0, matchLevel: 'none', matchedWords: [] },
        lvl1: { value: hierarchy.lvl1, matchLevel: 'full', matchedWords: [] },
      },
    },
    _snippetResult: {},
  }
}
