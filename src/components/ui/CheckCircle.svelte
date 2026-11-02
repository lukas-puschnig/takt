<script lang="ts">
  import { Check } from '@lucide/svelte'

  interface Props {
    checked: boolean
    size?: number
  }

  let { checked, size = 24 }: Props = $props()
</script>

<span
  class={[
    'grid shrink-0 place-items-center rounded-full border-[1.5px] transition-colors duration-150 ease-brand',
    checked ? 'border-primary bg-primary text-on-primary' : 'border-border text-transparent',
  ]}
  style:width="{size}px"
  style:height="{size}px"
  aria-hidden="true"
>
  <Check size={size * 0.62} strokeWidth={2.5} />
</span>
