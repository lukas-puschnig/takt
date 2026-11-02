<script lang="ts" generics="T extends string | number">
  interface Props {
    value: T
    options: { value: T; label: string }[]
    label: string
  }

  let { value = $bindable(), options, label }: Props = $props()
</script>

<div class="flex rounded-pill border border-border bg-bg p-1" role="radiogroup" aria-label={label}>
  {#each options as option (option.value)}
    <button
      type="button"
      role="radio"
      aria-checked={value === option.value}
      class={[
        'h-9 flex-1 rounded-pill px-3 text-sm font-semibold transition-colors duration-150',
        value === option.value ? 'bg-surface text-text shadow-sm' : 'text-text-muted',
      ]}
      onclick={() => (value = option.value)}
    >
      {option.label}
    </button>
  {/each}
</div>
