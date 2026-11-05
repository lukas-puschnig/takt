<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    ratio: number
    size?: number
    stroke?: number
    /** CSS-Farbe des Fortschritts, Standard: Primär. */
    color?: string
    /** Gleichmäßig im Sekundentakt laufen (Timer) statt weich einzurasten. */
    linear?: boolean
    children?: Snippet
  }

  let {
    ratio,
    size = 44,
    stroke = 4,
    color = 'var(--color-primary)',
    linear = false,
    children,
  }: Props = $props()

  const radius = $derived((size - stroke) / 2)
  const circumference = $derived(2 * Math.PI * radius)
  const offset = $derived(circumference * (1 - Math.min(1, Math.max(0, ratio))))
</script>

<div
  class="relative inline-grid shrink-0 place-items-center"
  style:width="{size}px"
  style:height="{size}px"
>
  <svg width={size} height={size} class="-rotate-90" aria-hidden="true">
    <circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke="var(--color-ring-track)"
      stroke-width={stroke}
    />
    <circle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke={color}
      stroke-width={stroke}
      stroke-linecap="round"
      stroke-dasharray={circumference}
      stroke-dashoffset={offset}
      class={['ring', linear && 'linear']}
      opacity={ratio > 0 ? 1 : 0}
    />
  </svg>
  {#if children}
    <div class="absolute inset-0 grid place-items-center">{@render children()}</div>
  {/if}
</div>

<style>
  .ring {
    transition:
      stroke-dashoffset var(--duration-base) var(--ease),
      stroke var(--duration-base) var(--ease);
  }
  .ring.linear {
    transition:
      stroke-dashoffset 1s linear,
      stroke var(--duration-base) var(--ease);
  }
  @media (prefers-reduced-motion: reduce) {
    .ring.linear {
      transition: none;
    }
  }
</style>
