/**
 * Sortieren per Ziehen am Griff. Auf die Liste anwenden; Einträge tragen `data-sort`,
 * der Griff darin `data-handle`. Beim Ziehen meldet `onmove(from, to)` jede Verschiebung
 * sofort, die Liste ordnet sich also live um. Funktioniert mit Maus und Touch.
 */
export interface SortableOptions {
  onmove: (from: number, to: number) => void
}

export function sortable(node: HTMLElement, options: SortableOptions) {
  let opts = options
  let dragging: HTMLElement | null = null
  let from = -1
  let pointer = -1

  const items = () =>
    [...node.children].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && 'sort' in el.dataset,
    )

  function down(e: PointerEvent) {
    const handle = (e.target as Element).closest('[data-handle]')
    if (!handle || !node.contains(handle)) return
    const item = handle.closest<HTMLElement>('[data-sort]')
    if (!item || item.parentElement !== node) return
    e.preventDefault()
    dragging = item
    from = items().indexOf(item)
    pointer = e.pointerId
    node.setPointerCapture(e.pointerId)
    item.dataset.dragging = ''
  }

  function move(e: PointerEvent) {
    if (!dragging || e.pointerId !== pointer) return
    const list = items()
    from = list.indexOf(dragging)
    // Ziel = Anzahl der anderen Einträge, deren Mitte über dem Zeiger liegt.
    let to = 0
    for (const el of list) {
      if (el === dragging) continue
      const r = el.getBoundingClientRect()
      if (r.top + r.height / 2 < e.clientY) to++
    }
    if (to !== from) {
      opts.onmove(from, to)
      from = to
    }
  }

  function up(e: PointerEvent) {
    if (!dragging || e.pointerId !== pointer) return
    delete dragging.dataset.dragging
    dragging = null
    if (node.hasPointerCapture(e.pointerId)) node.releasePointerCapture(e.pointerId)
  }

  node.addEventListener('pointerdown', down)
  node.addEventListener('pointermove', move)
  node.addEventListener('pointerup', up)
  node.addEventListener('pointercancel', up)

  return {
    update(next: SortableOptions) {
      opts = next
    },
    destroy() {
      node.removeEventListener('pointerdown', down)
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerup', up)
      node.removeEventListener('pointercancel', up)
    },
  }
}

/** Element in einer Liste verschieben (neue Liste). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
