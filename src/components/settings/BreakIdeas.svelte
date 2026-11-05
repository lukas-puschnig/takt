<script lang="ts">
  import { GripVertical, Plus, X } from '@lucide/svelte'
  import { moveItem, sortable } from '../../lib/actions/sortable'
  import { BREAK_IDEAS } from '../../lib/focus/breaks'
  import { app } from '../../lib/state/app.svelte'

  let text = $state('')

  const ideas = $derived(app.settings.breakIdeas)
  const set = (breakIdeas: string[]) => app.updateSettings({ breakIdeas })

  function add() {
    const idea = text.trim()
    if (!idea) return
    if (!ideas.includes(idea)) set([...ideas, idea])
    text = ''
  }

  const isDefault = $derived(
    ideas.length === BREAK_IDEAS.length && BREAK_IDEAS.every((x, i) => ideas[i] === x),
  )
</script>

<div class="flex flex-col gap-2">
  <span>
    <span class="block">Vorschläge für die Pause</span>
    <span class="block text-small text-text-muted">
      Erscheinen unter „Und in der Pause danach?“. Am Griff ziehen zum Sortieren.
    </span>
  </span>
  {#if ideas.length}
    <ul
      class="flex flex-col"
      use:sortable={{ onmove: (from, to) => set(moveItem(ideas, from, to)) }}
    >
      {#each ideas as idea (idea)}
        <li
          data-sort
          class="flex min-h-11 items-center gap-1 rounded-md border-b border-border last:border-0"
        >
          <span
            data-handle
            class="grid h-11 w-8 shrink-0 place-items-center text-text-muted"
            role="img"
            aria-label="Zum Verschieben ziehen"
          >
            <GripVertical size={18} />
          </span>
          <span class="flex-1">{idea}</span>
          <button
            type="button"
            class="grid size-10 shrink-0 place-items-center rounded-full text-text-muted hover:text-text"
            aria-label={`${idea} entfernen`}
            onclick={() => set(ideas.filter((x) => x !== idea))}
          >
            <X size={18} />
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  <div class="flex gap-2">
    <input
      class="field flex-1"
      bind:value={text}
      placeholder="Vorschlag hinzufügen"
      enterkeyhint="done"
      onkeydown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          add()
        }
      }}
    />
    <button
      type="button"
      class="btn btn-sm px-3 btn-secondary"
      aria-label="Vorschlag hinzufügen"
      onclick={add}
    >
      <Plus size={20} />
    </button>
  </div>
  {#if !isDefault}
    <button
      type="button"
      class="self-start text-small text-text-muted underline"
      onclick={() => set([...BREAK_IDEAS])}
    >
      Standardvorschläge wiederherstellen
    </button>
  {/if}
</div>
