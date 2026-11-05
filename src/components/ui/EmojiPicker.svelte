<script lang="ts">
  import { Search } from '@lucide/svelte'
  import { EMOJI_GROUPS, loadEmojis, searchEmojis, type Emoji } from '../../lib/emoji'

  interface Props {
    value: string | undefined
  }

  let { value = $bindable() }: Props = $props()

  // Schnellauswahl für Routinen; alle anderen über „Alle Emojis“ oder die Tastatur.
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

  let open = $state(false)
  let all = $state<Emoji[]>([])
  let failed = $state(false)
  let query = $state('')
  let group = $state<number>(EMOJI_GROUPS[0].id)

  const shown = $derived(
    query.trim() ? searchEmojis(all, query) : all.filter((e) => e.group === group),
  )

  function toggleAll() {
    open = !open
    if (open && !all.length) {
      failed = false
      loadEmojis().then(
        (list) => (all = list),
        () => (failed = true),
      )
    }
  }

  function pick(e: string) {
    value = value === e ? undefined : e
  }

  /** Erstes Graphem (ein Emoji kann aus mehreren Zeichen bestehen). */
  function first(text: string): string | undefined {
    const seg = new Intl.Segmenter('de', { granularity: 'grapheme' }).segment(text.trim())
    return [...seg][0]?.segment
  }
</script>

{#snippet cell(e: string, label: string)}
  <button
    type="button"
    class={[
      'grid h-9 place-items-center rounded-sm text-[20px] transition-colors',
      value === e ? 'bg-primary/15 ring-1 ring-primary' : 'hover:bg-bg',
    ]}
    title={label}
    aria-label={label}
    aria-pressed={value === e}
    onclick={() => pick(e)}>{e}</button
  >
{/snippet}

<div class="flex flex-col gap-2">
  <div class="grid grid-cols-8 gap-1">
    {#each EMOJIS as e (e)}
      {@render cell(e, `Emoji ${e}`)}
    {/each}
  </div>
  <div class="flex flex-wrap items-center gap-2">
    <input
      class="field w-20 text-center text-[20px]"
      value={value ?? ''}
      placeholder="…"
      aria-label="Eigenes Emoji"
      oninput={(e) => (value = first(e.currentTarget.value) || undefined)}
    />
    <button type="button" class="btn btn-sm btn-secondary" aria-expanded={open} onclick={toggleAll}>
      {open ? 'Weniger' : 'Alle Emojis'}
    </button>
    {#if value}
      <button
        type="button"
        class="text-small text-text-muted underline"
        onclick={() => (value = undefined)}>Kein Emoji</button
      >
    {/if}
  </div>

  {#if open}
    <div class="flex flex-col gap-2 rounded-md border border-border p-2">
      <label class="relative">
        <Search
          size={16}
          class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
        />
        <input
          class="field w-full pl-9"
          type="search"
          bind:value={query}
          placeholder="Suchen, z. B. Hund, Sport, Herz"
          aria-label="Emoji suchen"
          enterkeyhint="search"
        />
      </label>
      {#if !query.trim()}
        <div class="flex gap-1 overflow-x-auto" role="tablist" aria-label="Kategorien">
          {#each EMOJI_GROUPS as g (g.id)}
            <button
              type="button"
              role="tab"
              class={[
                'grid size-9 shrink-0 place-items-center rounded-sm text-[18px]',
                group === g.id ? 'bg-primary/15' : 'opacity-60 hover:opacity-100',
              ]}
              title={g.label}
              aria-label={g.label}
              aria-selected={group === g.id}
              onclick={() => (group = g.id)}>{g.icon}</button
            >
          {/each}
        </div>
      {/if}
      <div class="max-h-64 overflow-y-auto">
        {#if failed}
          <p class="p-2 text-small text-text-muted">
            Emojis konnten nicht geladen werden. Ohne Internet geht es über die Tastatur.
          </p>
        {:else if !all.length}
          <p class="p-2 text-small text-text-muted">Lädt …</p>
        {:else if !shown.length}
          <p class="p-2 text-small text-text-muted">Nichts gefunden.</p>
        {:else}
          <div class="grid grid-cols-8 gap-1">
            {#each shown as e (e.emoji)}
              {@render cell(e.emoji, e.label)}
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
