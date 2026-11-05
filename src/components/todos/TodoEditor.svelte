<script lang="ts">
  import { Bell, X } from '@lucide/svelte'
  import type { DateKey } from '../../lib/date'
  import { isNative } from '../../lib/native/notifications'
  import { app } from '../../lib/state/app.svelte'
  import { remindKey } from '../../lib/todos/todos'
  import type { Todo } from '../../lib/todos/types'
  import Sheet from '../ui/Sheet.svelte'
  import DayChips from './DayChips.svelte'

  interface Props {
    open: boolean
    todo: Todo | null
  }

  let { open = $bindable(), todo }: Props = $props()

  let title = $state('')
  let notes = $state('')
  let day = $state<DateKey | null>(null)
  let time = $state('')

  $effect(() => {
    if (!open || !todo) return
    title = todo.title
    notes = todo.notes ?? ''
    day = todo.day ?? null
    time = todo.remindAt?.split('T')[1] ?? ''
  })

  /** Erinnerung am geplanten Tag (ohne Tag: heute); unverändert bleibt z. B. ein Schlummern erhalten. */
  function reminder(t: Todo): string | undefined {
    if (!time) return undefined
    const [oldDay, oldTime] = t.remindAt?.split('T') ?? []
    if (t.remindAt && oldTime === time && (day ?? null) === (t.day ?? null) && oldDay) {
      return t.remindAt
    }
    return remindKey(day ?? app.today, time)
  }

  function save() {
    if (!todo || !title.trim()) return
    const remindAt = reminder(todo)
    app.saveTodo({
      id: todo.id,
      title: title.trim(),
      createdOn: todo.createdOn,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(day ? { day } : {}),
      ...(remindAt ? { remindAt } : {}),
      ...(todo.doneOn ? { doneOn: todo.doneOn } : {}),
    })
    open = false
  }

  function remove() {
    if (!todo) return
    app.deleteTodo(todo.id)
    open = false
  }
</script>

<Sheet bind:open title="Aufgabe">
  <form
    class="flex flex-col gap-6"
    onsubmit={(e) => {
      e.preventDefault()
      save()
    }}
  >
    <label class="flex flex-col gap-1.5">
      <span class="text-label text-text-muted">Titel</span>
      <input class="field" bind:value={title} required />
    </label>

    <div class="flex flex-col gap-2">
      <span class="text-label text-text-muted">Wann</span>
      <DayChips bind:value={day} today={app.today} />
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="flex items-center justify-between gap-4">
        <span class="flex items-center gap-2 text-label text-text-muted">
          <Bell size={14} /> Erinnerung
        </span>
        <span class="flex items-center gap-1">
          <input class="field w-32" type="time" bind:value={time} />
          {#if time}
            <button
              type="button"
              class="grid size-10 place-items-center rounded-full text-text-muted hover:text-text"
              aria-label="Erinnerung entfernen"
              onclick={() => (time = '')}
            >
              <X size={18} />
            </button>
          {/if}
        </span>
      </label>
      {#if !isNative}
        <p class="text-small text-text-muted">Erinnerungen kommen nur in der Android-App.</p>
      {/if}
    </div>

    <label class="flex flex-col gap-1.5">
      <span class="text-label text-text-muted">Notiz</span>
      <textarea class="field min-h-20" bind:value={notes} placeholder="Optional"></textarea>
    </label>

    <div class="flex flex-col gap-3 pt-2">
      <button type="submit" class="btn btn-primary" disabled={!title.trim()}>Speichern</button>
      <button type="button" class="btn btn-secondary" onclick={remove}>Löschen</button>
    </div>
  </form>
</Sheet>
