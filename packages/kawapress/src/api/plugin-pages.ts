export type MaybePromise<T> = T | Promise<T>

/** Name of the parameter a route segment such as `[name]` or `[...slug]` declares. */
type SegmentParam<Segment extends string>
  = Segment extends `[...${infer Name}]` ? Name
    : Segment extends `[${infer Name}]` ? Name
      : never

type RouteParamNames<Route extends string>
  = Route extends `${infer Head}/${infer Tail}`
    ? SegmentParam<Head> | RouteParamNames<Tail>
    : SegmentParam<Route>

/**
 * Parameters a route template declares, read from the literal the route is
 * written as: `'/team/[id]'` gives `{ id: string }`. A route without
 * parameters, or a route that is not a literal, has none.
 */
export type RouteParams<Route extends string>
  = [RouteParamNames<Route>] extends [never]
    ? Record<never, never>
    : { [Name in RouteParamNames<Route>]: string }

/** What a plugin gives for one page: its Markdown and extra frontmatter. */
export interface PluginPageContent {
  /** Markdown source. `<!--@include-->` is not supported. */
  markdown: string
  /**
   * Merged into the frontmatter of the page; a key given here replaces the
   * same key of the Markdown's own frontmatter. JSON values only.
   */
  frontmatter?: Record<string, unknown>
}

/** What a generator function of `pages()` receives. */
export interface PluginPagesContext {
  /** `dev` while serving the site, `build` for `kawapress build`. */
  command: 'dev' | 'build'
  /**
   * Reads a UTF-8 text file and records it as a dependency of this group of
   * pages. A relative path starts from the site root.
   */
  read: (path: string) => Promise<string>
  /**
   * Finds files and returns their absolute paths, sorted. The pattern is
   * recorded as a dependency of this group of pages. A relative pattern starts
   * from the site root.
   */
  glob: (pattern: string | readonly string[]) => Promise<string[]>
}

/**
 * Returns the pages of a route with parameters, one item per page that gives
 * every parameter. A route without parameters is a single page: a Markdown
 * string or a {@link PluginPageContent}.
 */
export type PluginPagesGenerator<Route extends string> = (
  context: Readonly<PluginPagesContext>,
) => MaybePromise<
  [RouteParamNames<Route>] extends [never]
    ? string | PluginPageContent
    : readonly (RouteParams<Route> & PluginPageContent)[]
>

/** The second argument of `pages()`: a file template or a generator function. */
export type PluginPagesSource<Route extends string = string>
  = string | PluginPagesGenerator<Route>

export type RegisterPluginPages = <const Route extends string>(
  route: Route,
  source: PluginPagesSource<Route>,
) => void
