<script lang="ts">
  import type { Snippet } from 'svelte'
  import ProgressRing from '../ui/ProgressRing.svelte'

  interface Props {
    /** Fortschritt 0–1, solange nicht eingestellt wird. */
    ratio: number
    color: string
    /** Drehen erlaubt: der Ring zeigt dann die gewählte Dauer (eine Umdrehung = `max`). */
    adjustable?: boolean
    minutes?: number
    onchange?: (minutes: number) => void
    max?: number
    step?: number
    size?: number
    children?: Snippet
  }

  let {
    ratio,
    color,
    adjustable = false,
    minutes = 25,
    onchange,
    max = 120,
    step = 5,
    size = 280,
    children,
  }: Props = $props()

  const stroke = 6
  let el: HTMLDivElement
  let dragging = $state(false)

  const shown = $derived(adjustable ? minutes / max : ratio)
  // Griff auf dem Ring bei der gewählten Dauer
  const knob = $derived.by(() => {
    const a = (Math.min(minutes, max) / max) * 2 * Math.PI
    const r = (size - stroke) / 2
    return { x: size / 2 + r * Math.sin(a), y: size / 2 - r * Math.cos(a) }
  })

  function fromPointer(e: PointerEvent) {
    const rect = el.getBoundingClientRect()
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    let angle = Math.atan2(dx, -dy)
    if (angle < 0) angle += 2 * Math.PI
    let m = Math.round(((angle / (2 * Math.PI)) * max) / step) * step
    // Nicht über 12 Uhr hinweg springen: oben bleibt man am Anfang bzw. am Ende stehen.
    if (minutes > max * 0.75 && m < max * 0.25) m = max
    if (minutes < max * 0.25 && m > max * 0.75) m = step
    m = Math.min(max, Math.max(step, m))
    if (m !== minutes) onchange?.(m)
  }

  function down(e: PointerEvent) {
    if (!adjustable) return
    dragging = true
    el.setPointerCapture(e.pointerId)
    fromPointer(e)
  }

  function key(e: KeyboardEvent) {
    if (!adjustable) return
    const delta =
      e.key === 'ArrowUp' || e.key === 'ArrowRight'
        ? step
        : e.key === 'ArrowDown' || e.key === 'ArrowLeft'
          ? -step
          : 0
    if (!delta) return
    e.preventDefault()
    onchange?.(Math.min(max, Math.max(step, minutes + delta)))
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  bind:this={el}
  class={[
    'relative select-none',
    adjustable && 'cursor-grab touch-none',
    dragging && 'cursor-grabbing',
  ]}
  style:width="{size}px"
  style:height="{size}px"
  role={adjustable ? 'slider' : undefined}
  tabindex={adjustable ? 0 : undefined}
  aria-label={adjustable ? 'Taktlänge in Minuten' : undefined}
  aria-valuemin={adjustable ? step : undefined}
  aria-valuemax={adjustable ? max : undefined}
  aria-valuenow={adjustable ? minutes : undefined}
  onpointerdown={down}
  onpointermove={(e) => dragging && fromPointer(e)}
  onpointerup={() => (dragging = false)}
  onpointercancel={() => (dragging = false)}
  onkeydown={key}
>
  <ProgressRing ratio={shown} {size} {stroke} {color} linear={!adjustable}>
    {@render children?.()}
  </ProgressRing>
  {#if adjustable}
    <svg class="pointer-events-none absolute inset-0" width={size} height={size} aria-hidden="true">
      <circle
        cx={knob.x}
        cy={knob.y}
        r="11"
        fill="var(--color-surface)"
        stroke={color}
        stroke-width="3"
      />
    </svg>
  {/if}
</div>
