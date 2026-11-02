<script lang="ts">
  import { ArrowDown, ArrowUp, CalendarDays, Plus, Trash2 } from '@lucide/svelte'
  import type { Weekday } from '../../lib/date'
  import { uid } from '../../lib/id'
  import { PRESETS, describeDays } from '../../lib/routines/format'
  import type { Routine, Subtask } from '../../lib/routines/types'
  import { app } from '../../lib/state/app.svelte'
  import Segmented from '../ui/Segmented.svelte'
  import Sheet from '../ui/Sheet.svelte'
  import Switch from '../ui/Switch.svelte'
  import WeekdayPicker from '../ui/WeekdayPicker.svelte'

  interface Props {
    open: boolean
    /** Zu bearbeitende Routine; null legt eine neue an. */
    routine: Routine | null
  }

  let { open = $bindable(), routine }: Props = $props()

  // Formularzustand, wird beim Öffnen aus der Routine befüllt.
  let title = $state('')
  let time = $state('')
  let notes = $state('')
  let paused = $state(false)
  let mode = $state<'weekly' | 'interval'>('weekly')
  let days = $state<Weekday[]>([])
  let every = $state(2)
  let start = $state('')
  let subtasks = $state<Subtask[]>([])
  let newSubtask = $state('')
  let dayEditing = $state<string | null>(null)

  $effect(() => {
    if (!open) return
    const r = routine
    title = r?.title ?? ''
    time = r?.time ?? ''
    notes = r?.notes ?? ''
    paused = !!r?.archived
    mode = r?.schedule.type ?? 'weekly'
    days = r?.schedule.type === 'weekly' ? [...r.schedule.days] : [1, 2, 3, 4, 5, 6, 7]
    every = r?.schedule.type === 'interval' ? r.schedule.every : 2
    start = r?.schedule.type === 'interval' ? r.schedule.start : app.today
    subtasks = r?.subtasks.map((s) => ({ ...s, days: s.days ? [...s.days] : undefined })) ?? []
    newSubtask = ''
    dayEditing = null
  })

  const valid = $derived(
    title.trim().length > 0 && (mode === 'interval' ? every >= 1 && !!start : days.length > 0),
  )

  function addSubtask() {
    const text = newSubtask.trim()
    if (!text) return
    subtasks.push({ id: uid(), title: text })
    newSubtask = ''
  }

  function move(index: number, delta: -1 | 1) {
    const to = index + delta
    if (to < 0 || to >= subtasks.length) return
    ;[subtasks[index], subtasks[to]] = [subtasks[to], subtasks[index]]
  }

  function save() {
    if (!valid) return
    addSubtask()
    app.saveRoutine({
      id: routine?.id ?? uid(),
      title: title.trim(),
      time: time || undefined,
      notes: notes.trim() || undefined,
      archived: paused || undefined,
      createdOn: routine?.createdOn ?? app.today,
      schedule:
        mode === 'weekly'
          ? { type: 'weekly', days: [...days].sort() }
          : { type: 'interval', every: Math.floor(every), start },
      subtasks: subtasks
        .filter((s) => s.title.trim())
        .map((s) => ({
          id: s.id,
          title: s.title.trim(),
          ...(s.days?.length ? { days: [...s.days].sort() } : {}),
        })),
    })
    open = false
  }

  function remove() {
    if (!routine) return
    if (!confirm(`„${routine.title}“ und den gesamten Verlauf löschen?`)) return
    app.deleteRoutine(routine.id)
    open = false
  }
</script>

<Sheet bind:open title={routine ? 'Routine bearbeiten' : 'Neue Routine'}>
  <form
    class="flex flex-col gap-6"
    onsubmit={(e) => {
      e.preventDefault()
      save()
    }}
  >
    <div class="grid grid-cols-[1fr_auto] gap-3">
      <label class="flex flex-col gap-1.5">
        <span class="text-label text-text-muted">Titel</span>
        <!-- svelte-ignore a11y_autofocus -->
        <input
          class="field"
          bind:value={title}
          placeholder="z. B. Morgens"
          autofocus={!routine}
          required
        />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-label text-text-muted">Uhrzeit</span>
        <input class="field w-32" type="time" bind:value={time} />
      </label>
    </div>

    <section class="flex flex-col gap-3">
      <span class="text-label text-text-muted">Rhythmus</span>
      <Segmented
        bind:value={mode}
        label="Rhythmus"
        options={[
          { value: 'weekly', label: 'Wochentage' },
          { value: 'interval', label: 'Alle N Tage' },
        ]}
      />
      {#if mode === 'weekly'}
        <WeekdayPicker bind:value={days} weekStart={app.settings.weekStart} />
        <div class="flex flex-wrap gap-2">
          {#each PRESETS as preset (preset.label)}
            <button
              type="button"
              class="h-8 rounded-sm border border-border px-3 text-small text-text-muted hover:text-text"
              onclick={() => (days = [...preset.days])}
            >
              {preset.label}
            </button>
          {/each}
        </div>
      {:else}
        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-small text-text-muted">Alle … Tage</span>
            <input class="field" type="number" min="1" max="365" bind:value={every} />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-small text-text-muted">Ab</span>
            <input class="field" type="date" bind:value={start} />
          </label>
        </div>
      {/if}
    </section>

    <section class="flex flex-col gap-2">
      <span class="text-label text-text-muted">Schritte</span>
      {#if subtasks.length}
        <ul class="flex flex-col gap-2">
          {#each subtasks as sub, i (sub.id)}
            <li class="rounded-md border border-border px-2 pt-1 pb-1.5">
              <div class="flex items-center gap-1">
                <input
                  class="field min-h-10 flex-1 border-transparent bg-transparent px-2"
                  bind:value={sub.title}
                  aria-label="Schritt"
                />
                <button
                  type="button"
                  class="grid size-10 shrink-0 place-items-center rounded-full text-text-muted hover:text-text"
                  aria-label="Schritt entfernen"
                  onclick={() => subtasks.splice(i, 1)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div class="flex items-center gap-1 pl-2">
                <button
                  type="button"
                  class={[
                    'inline-flex h-8 items-center gap-1.5 rounded-sm text-small',
                    sub.days?.length ? 'text-primary' : 'text-text-muted',
                  ]}
                  aria-expanded={dayEditing === sub.id}
                  onclick={() => (dayEditing = dayEditing === sub.id ? null : sub.id)}
                >
                  <CalendarDays size={15} />
                  {sub.days?.length ? describeDays(sub.days, app.settings.weekStart) : 'Immer'}
                </button>
                <span class="flex-1"></span>
                <button
                  type="button"
                  class="grid size-8 place-items-center rounded-full text-text-muted disabled:opacity-30"
                  aria-label="Nach oben"
                  disabled={i === 0}
                  onclick={() => move(i, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  class="grid size-8 place-items-center rounded-full text-text-muted disabled:opacity-30"
                  aria-label="Nach unten"
                  disabled={i === subtasks.length - 1}
                  onclick={() => move(i, 1)}
                >
                  <ArrowDown size={16} />
                </button>
              </div>
              {#if dayEditing === sub.id}
                <div class="flex flex-col gap-2 px-2 pt-1 pb-1">
                  <p class="text-small text-text-muted">
                    Nur an diesen Tagen. Nichts gewählt heißt: immer, wenn die Routine dran ist.
                  </p>
                  <WeekdayPicker
                    bind:value={() => sub.days ?? [], (v) => (sub.days = v)}
                    weekStart={app.settings.weekStart}
                    size="sm"
                  />
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
      <div class="flex gap-2">
        <input
          class="field flex-1"
          bind:value={newSubtask}
          placeholder="Schritt hinzufügen"
          onkeydown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addSubtask()
            }
          }}
        />
        <button
          type="button"
          class="btn btn-sm px-3 btn-secondary"
          aria-label="Schritt hinzufügen"
          onclick={addSubtask}
        >
          <Plus size={20} />
        </button>
      </div>
      <p class="text-small text-text-muted">Ohne Schritte wird die Routine als Ganzes abgehakt.</p>
    </section>

    <label class="flex flex-col gap-1.5">
      <span class="text-label text-text-muted">Notiz</span>
      <textarea class="field min-h-20" bind:value={notes} placeholder="Optional"></textarea>
    </label>

    <Switch
      bind:checked={paused}
      label="Pausiert"
      hint="Erscheint nicht mehr, Verlauf bleibt erhalten."
    />

    <div class="flex flex-col gap-3 pt-2">
      <button type="submit" class="btn btn-primary" disabled={!valid}>Speichern</button>
      {#if routine}
        <button type="button" class="btn btn-secondary" onclick={remove}>Löschen</button>
      {/if}
    </div>
  </form>
</Sheet>
