<script lang="ts">
  interface Props {
    value: string | undefined
  }

  let { value = $bindable() }: Props = $props()

  // Kleine Auswahl für Routinen; jedes andere Emoji geht über die Tastatur ins Feld.
  const EMOJIS = [
    '💧',
    '☕',
    '🍵',
    '🥗',
    '🍎',
    '💊',
    '🦷',
    '🚿',
    '🛏️',
    '😴',
    '🧘',
    '🤸',
    '🏃',
    '🚶',
    '🚴',
    '🏋️',
    '🧠',
    '📖',
    '✍️',
    '📝',
    '💻',
    '📧',
    '📞',
    '🗓️',
    '🇪🇸',
    '🎧',
    '🎸',
    '🌱',
    '🧹',
    '🧺',
    '🛒',
    '💰',
    '☀️',
    '🌙',
    '🔥',
    '⭐',
    '❤️',
    '✅',
    '⚡',
    '🎯',
  ]

  /** Erstes Graphem (ein Emoji kann aus mehreren Zeichen bestehen). */
  function first(text: string): string | undefined {
    const seg = new Intl.Segmenter('de', { granularity: 'grapheme' }).segment(text.trim())
    return [...seg][0]?.segment
  }
</script>

<div class="flex flex-col gap-2">
  <div class="grid grid-cols-8 gap-1">
    {#each EMOJIS as e (e)}
      <button
        type="button"
        class={[
          'grid h-9 place-items-center rounded-sm text-[20px] transition-colors',
          value === e ? 'bg-primary/15 ring-1 ring-primary' : 'hover:bg-bg',
        ]}
        aria-label={`Emoji ${e}`}
        aria-pressed={value === e}
        onclick={() => (value = value === e ? undefined : e)}>{e}</button
      >
    {/each}
  </div>
  <div class="flex items-center gap-2">
    <input
      class="field w-20 text-center text-[20px]"
      value={value ?? ''}
      placeholder="…"
      aria-label="Eigenes Emoji"
      oninput={(e) => (value = first(e.currentTarget.value) || undefined)}
    />
    {#if value}
      <button
        type="button"
        class="text-small text-text-muted underline"
        onclick={() => (value = undefined)}>Kein Emoji</button
      >
    {/if}
  </div>
</div>
