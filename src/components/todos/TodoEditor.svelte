<script lang="ts">
  import type { DateKey } from '../../lib/date'
  import { app } from '../../lib/state/app.svelte'
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

  $effect(() => {
    if (!open || !todo) return
    title = todo.title
    notes = todo.notes ?? ''
    day = todo.day ?? null
  })

  function save() {
    if (!todo || !title.trim()) return
    app.saveTodo({
      id: todo.id,
      title: title.trim(),
      createdOn: todo.createdOn,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(day ? { day } : {}),
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
