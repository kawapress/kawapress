import type { OverlayScrollbars as OverlayScrollbarsInstance } from 'overlayscrollbars'
import { onMounted, onUnmounted } from 'vue'
import { loadOverlayScrollbars, resolveNagiScrollOptions } from '../os-scroll'

const TABLE_HOST = '.nagi-table'
const TABLE_VIEWPORT = '.nagi-table__viewport'

const tableScrollOptions = resolveNagiScrollOptions({
  overflow: { y: 'hidden' },
})

/**
 * Gives every Markdown table scroll area (see `tables.ts`) the nagi
 * OverlayScrollbars look once the page is interactive. Tables arrive with
 * route changes, HMR and lazily rendered content, so a mutation observer picks
 * up new hosts and releases the instances of hosts that left the document.
 * Before the runtime loads, a wide table already scrolls with the themed
 * native scrollbar.
 */
export function useMarkdownTableScroll(): void {
  const instances = new Map<HTMLElement, OverlayScrollbarsInstance>()
  let observer: MutationObserver | undefined
  let scheduled = false
  let disposed = false

  onMounted(() => {
    observer = new MutationObserver(schedule)
    observer.observe(document.body, { childList: true, subtree: true })
    schedule()
  })

  onUnmounted(() => {
    disposed = true
    observer?.disconnect()
    instances.forEach(instance => instance.destroy())
    instances.clear()
  })

  function schedule(): void {
    if (scheduled) {
      return
    }
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      void sync()
    })
  }

  async function sync(): Promise<void> {
    instances.forEach((instance, host) => {
      if (!host.isConnected) {
        instance.destroy()
        instances.delete(host)
      }
    })
    const hosts = [...document.querySelectorAll<HTMLElement>(TABLE_HOST)]
      .filter(host => !instances.has(host))
    if (hosts.length === 0) {
      return
    }
    let runtime: Awaited<ReturnType<typeof loadOverlayScrollbars>>
    try {
      runtime = await loadOverlayScrollbars()
    }
    catch {
      // The tables keep scrolling with their themed native scrollbar; the doc
      // scroll area already reports the missing chunk.
      return
    }
    if (disposed) {
      return
    }
    for (const host of hosts) {
      const viewport = host.querySelector<HTMLElement>(`:scope > ${TABLE_VIEWPORT}`)
      if (!viewport || !host.isConnected || instances.has(host)) {
        continue
      }
      instances.set(host, runtime.OverlayScrollbars({
        target: host,
        elements: { viewport, content: viewport },
      }, tableScrollOptions))
    }
  }
}
