import type { MaybePromise, PluginPagesContext } from '../api/plugin-pages'
import type { FileEvent, PageDependencies } from './page-dependencies'
import type { PageGroup } from './page-group'
import type { PluginPageRecord } from './plugin-pages'
import { consola } from 'consola'
import { isAffectedBy, listWatchTargets, mergeDependencies } from './page-dependencies'
import { assertUniquePluginRoutes } from './plugin-pages'

/** The part of a file watcher the collection needs; the dev server's watcher fits. */
export interface PageWatcher {
  add: (paths: string[]) => unknown
  on: (event: FileEvent, listener: (file: string) => void) => unknown
}

export interface PluginPageCollectionOptions {
  groups: readonly PageGroup[]
  command: PluginPagesContext['command']
  /** Throws when the pages of every group together are not acceptable, for example on a route a Markdown file has. */
  validate: (records: readonly PluginPageRecord[]) => MaybePromise<void>
  /** Called after groups ran again in the dev server, with the pages before and after. */
  onChange: (before: readonly PluginPageRecord[], after: readonly PluginPageRecord[]) => void
}

export interface PluginPageCollection {
  /** Pages of every group; the groups run once, in registration order, on the first call. */
  records: () => Promise<PluginPageRecord[]>
  /** Runs again only the groups a file event touches, and reports the new pages. */
  watch: (watcher: PageWatcher) => void
}

interface GroupState {
  group: PageGroup
  records: PluginPageRecord[]
  dependencies: PageDependencies
}

export function createPluginPageCollection(options: PluginPageCollectionOptions): PluginPageCollection {
  const { groups, command, validate, onChange } = options
  let states: GroupState[] | undefined
  let loading: Promise<GroupState[]> | undefined
  let watcher: PageWatcher | undefined
  let queue = Promise.resolve()

  const flatten = (list: readonly GroupState[]) => list.flatMap(state => state.records)

  const watchTargets = (list: readonly GroupState[]): void => {
    const targets = list.flatMap(state => listWatchTargets(state.dependencies))
    if (watcher && targets.length > 0) {
      watcher.add(targets)
    }
  }

  const load = async (): Promise<GroupState[]> => {
    const loaded: GroupState[] = []
    for (const group of groups) {
      const run = await group.run(command)
      if (run.error !== undefined) {
        throw run.error
      }
      loaded.push({ group, records: run.records, dependencies: run.dependencies })
    }
    assertUniquePluginRoutes(flatten(loaded))
    states = loaded
    watchTargets(loaded)
    return loaded
  }

  const rerun = async (affected: readonly GroupState[]): Promise<void> => {
    const current = states!
    const before = flatten(current)
    const next = new Map<GroupState, GroupState>()
    for (const state of affected) {
      const run = await state.group.run('dev')
      if (run.error === undefined) {
        next.set(state, { ...state, records: run.records, dependencies: run.dependencies })
        continue
      }
      consola.error(`KawaPress: ${state.group.label} failed; its previous pages stay.`, run.error)
      // The failed run may have read a file that is missing now; keep watching it.
      next.set(state, { ...state, dependencies: mergeDependencies(state.dependencies, run.dependencies) })
    }

    let candidate = current.map(state => next.get(state) ?? state)
    try {
      assertUniquePluginRoutes(flatten(candidate))
      await validate(flatten(candidate))
    }
    catch (error) {
      consola.error('KawaPress: the new plugin pages are not acceptable; the previous pages stay.', error)
      candidate = current.map(state => (
        next.has(state) ? { ...state, dependencies: next.get(state)!.dependencies } : state
      ))
    }
    states = candidate
    watchTargets(candidate.filter(state => affected.some(item => item.group === state.group)))
    onChange(before, flatten(candidate))
  }

  const handle = async (event: FileEvent, file: string): Promise<void> => {
    await loading?.catch(() => undefined)
    const affected = states?.filter(state => isAffectedBy(state.dependencies, event, file))
    if (affected?.length) {
      await rerun(affected)
    }
  }

  return {
    async records() {
      if (!loading) {
        const current = load()
        loading = current
        // A failed run must not stay cached: the next call tries again.
        current.catch(() => {
          if (loading === current) {
            loading = undefined
          }
        })
      }
      await loading
      return flatten(states!)
    },
    watch(target) {
      watcher = target
      for (const event of ['add', 'change', 'unlink'] as const) {
        target.on(event, (file) => {
          queue = queue
            .then(() => handle(event, file))
            .catch(error => consola.error('KawaPress: updating plugin pages failed', error))
        })
      }
      if (states) {
        watchTargets(states)
      }
    },
  }
}
