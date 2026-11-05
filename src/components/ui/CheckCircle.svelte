<script lang="ts">
  import { Check } from '@lucide/svelte'

  interface Props {
    checked: boolean
    size?: number
    /** CSS-Farbe für den abgehakten Zustand, Standard: Primär. */
    color?: string
    /** Gestrichelter Rand, z. B. für optionale Schritte. */
    dashed?: boolean
  }

  let { checked, size = 24, color = 'var(--color-primary)', dashed = false }: Props = $props()
</script>

<span
  class={[
    'grid shrink-0 place-items-center rounded-full border-[1.5px] transition-colors duration-150 ease-brand',
    checked ? 'text-on-primary' : 'border-border text-transparent',
    dashed && !checked && 'border-dashed',
  ]}
  style:width="{size}px"
  style:height="{size}px"
  style:background={checked ? color : undefined}
  style:border-color={checked ? color : undefined}
  aria-hidden="true"
>
  <Check size={size * 0.62} strokeWidth={2.5} />
</span>
