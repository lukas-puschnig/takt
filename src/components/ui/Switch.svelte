<script lang="ts">
  interface Props {
    checked: boolean
    label: string
    hint?: string
  }

  let { checked = $bindable(), label, hint }: Props = $props()
</script>

<label class="flex min-h-11 cursor-pointer items-center justify-between gap-4">
  <span>
    <span class="block">{label}</span>
    {#if hint}<span class="block text-small text-text-muted">{hint}</span>{/if}
  </span>
  <input type="checkbox" class="peer sr-only" bind:checked />
  <span
    class="relative h-7 w-12 shrink-0 rounded-pill bg-border transition-colors duration-150 peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-surface after:transition-transform after:duration-150 peer-checked:after:translate-x-5"
    aria-hidden="true"
  ></span>
</label>
