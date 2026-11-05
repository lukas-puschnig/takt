<script lang="ts">
  import { Bell, GripVertical, Plus, SlidersHorizontal, Trash2 } from '@lucide/svelte'
  import { slide } from 'svelte/transition'
  import { moveItem, sortable } from '../../lib/actions/sortable'
  import type { Weekday } from '../../lib/date'
  import { uid } from '../../lib/id'
  import { isNative } from '../../lib/native/notifications'
  import { ROUTINE_COLORS, routineColor } from '../../lib/routines/colors'
  import { PRESETS, describeDays } from '../../lib/routines/format'
  import type { Routine, Subtask } from '../../lib/routines/types'
  import { app } from '../../lib/state/app.svelte'
  import EmojiPicker from '../ui/EmojiPicker.svelte'
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

  /** Erinnerungsintervalle in Minuten; 0 = einmal. */
  const INTERVALS = [0, 5, 10, 15, 30, 60]
  const intervalLabel = (m: number) => (m ? `alle ${m} min` : 'einmal')

  // Formularzustand, wird beim Öffnen aus der Routine befüllt.
  let title = $state('')
  let time = $state('')
  let notes = $state('')
  let color = $state<string | undefined>(undefined)
  /** -1 = keine Erinnerung, sonst Intervall (0 = einmal). */
  let remind = $state(-1)
  let paused = $state(false)
  let mode = $state<'weekly' | 'interval'>('weekly')
  let days = $state<Weekday[]>([])
  let every = $state(2)
  let start = $state('')
  let subtasks = $state<Subtask[]>([])
  let newSubtask = $state('')
  let detailsOpen = $state<string | null>(null)

  $effect(() => {
    if (!open) return
    const r = routine
    title = r?.title ?? ''
    time = r?.time ?? ''
    notes = r?.notes ?? ''
    color = r?.color
    remind = r?.reminder ? r.reminder.every : -1
    paused = !!r?.archived
    mode = r?.schedule.type ?? 'weekly'
    days = r?.schedule.type === 'weekly' ? [...r.schedule.days] : [1, 2, 3, 4, 5, 6, 7]
    every = r?.schedule.type === 'interval' ? r.schedule.every : 2
    start = r?.schedule.type === 'interval' ? r.schedule.start : app.today
    subtasks = r?.subtasks.map((s) => ({ ...s, days: s.days ? [...s.days] : undefined })) ?? []
    newSubtask = ''
    detailsOpen = null
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

  /** Kurzbeschreibung der Zusatzoptionen eines Schritts. */
  function summary(s: Subtask): string[] {
    const out: string[] = []
    if (s.days?.length) out.push(describeDays(s.days, app.settings.weekStart))
    if (s.optional) out.push('optional')
    if (s.time) out.push(s.nag ? `${s.time} · wichtig, ${intervalLabel(s.nag)}` : s.time)
    return out
  }

  function cleanSubtask(s: Subtask): Subtask {
    return {
      id: s.id,
      title: s.title.trim(),
      ...(s.emoji ? { emoji: s.emoji } : {}),
      ...(s.days?.length ? { days: [...s.days].sort() } : {}),
      ...(s.optional ? { optional: true } : {}),
      ...(s.time ? { time: s.time } : {}),
      ...(s.time && s.nag ? { nag: s.nag } : {}),
    }
  }

  function save() {
    if (!valid) return
    addSubtask()
    app.saveRoutine({
      id: routine?.id ?? uid(),
      title: title.trim(),
      time: time || undefined,
      notes: notes.trim() || undefined,
      color,
      reminder: time && remind >= 0 ? { every: remind } : undefined,
      archived: paused || undefined,
      createdOn: routine?.createdOn ?? app.today,
      schedule:
        mode === 'weekly'
          ? { type: 'weekly', days: [...days].sort() }
          : { type: 'interval', every: Math.floor(every), start },
      subtasks: subtasks.filter((s) => s.title.trim()).map(cleanSubtask),
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

    {#if time}
      <label class="flex items-center justify-between gap-4" transition:slide={{ duration: 150 }}>
        <span class="flex items-center gap-2">
          <Bell size={16} class="text-text-muted" /> Erinnern
        </span>
        <select class="field w-40" bind:value={remind}>
          <option value={-1}>Nein</option>
          {#each INTERVALS as m (m)}
            <option value={m}>{m ? `${intervalLabel(m)}, bis erledigt` : 'Einmal'}</option>
          {/each}
        </select>
      </label>
    {/if}

    <section class="flex flex-col gap-2">
      <span class="text-label text-text-muted">Farbe</span>
      <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Farbe">
        {#each ROUTINE_COLORS as c (c.key)}
          {@const active = (color ?? 'fuchsia') === c.key}
          <button
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={c.label}
            title={c.label}
            class={[
              'grid size-9 place-items-center rounded-full border-2 transition-colors',
              active ? 'border-text' : 'border-transparent',
            ]}
            onclick={() => (color = c.key === 'fuchsia' ? undefined : c.key)}
          >
            <span class="size-6 rounded-full" style:background={routineColor(c.key)}></span>
          </button>
        {/each}
      </div>
    </section>

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
        <ul
          class="flex flex-col gap-2"
          use:sortable={{ onmove: (from, to) => (subtasks = moveItem(subtasks, from, to)) }}
        >
          {#each subtasks as sub, i (sub.id)}
            {@const meta = summary(sub)}
            <li data-sort class="rounded-md border border-border py-1 pr-1">
              <div class="flex items-center">
                <span
                  data-handle
                  class="grid h-10 w-8 shrink-0 place-items-center text-text-muted"
                  aria-label="Zum Verschieben ziehen"
                  role="img"
                >
                  <GripVertical size={18} />
                </span>
                {#if sub.emoji}<span class="pr-1 text-[18px]">{sub.emoji}</span>{/if}
                <input
                  class="field min-h-10 flex-1 border-transparent bg-transparent px-1"
                  bind:value={sub.title}
                  aria-label="Schritt"
                />
                <button
                  type="button"
                  class={[
                    'grid size-10 shrink-0 place-items-center rounded-full hover:text-text',
                    detailsOpen === sub.id || meta.length ? 'text-primary' : 'text-text-muted',
                  ]}
                  aria-label="Optionen"
                  aria-expanded={detailsOpen === sub.id}
                  onclick={() => (detailsOpen = detailsOpen === sub.id ? null : sub.id)}
                >
                  <SlidersHorizontal size={18} />
                </button>
                <button
                  type="button"
                  class="grid size-10 shrink-0 place-items-center rounded-full text-text-muted hover:text-text"
                  aria-label="Schritt entfernen"
                  onclick={() => subtasks.splice(i, 1)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
              {#if meta.length && detailsOpen !== sub.id}
                <p class="pb-1 pl-8 text-small text-text-muted">{meta.join(' · ')}</p>
              {/if}
              {#if detailsOpen === sub.id}
                <div
                  class="flex flex-col gap-4 px-3 pt-2 pb-3"
                  transition:slide={{ duration: 150 }}
                >
                  <div class="flex flex-col gap-1.5">
                    <span class="text-small text-text-muted">Emoji</span>
                    <EmojiPicker bind:value={sub.emoji} />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <span class="text-small text-text-muted">
                      Nur an diesen Tagen (nichts gewählt = immer)
                    </span>
                    <WeekdayPicker
                      bind:value={() => sub.days ?? [], (v) => (sub.days = v)}
                      weekStart={app.settings.weekStart}
                      size="sm"
                    />
                  </div>
                  <Switch
                    bind:checked={() => !!sub.optional, (v) => (sub.optional = v || undefined)}
                    label="Optional"
                    hint="Zählt nicht für „erledigt“. Der Ring wird schon ohne voll."
                  />
                  <label class="flex items-center justify-between gap-4">
                    <span>Uhrzeit</span>
                    <input class="field w-32" type="time" bind:value={sub.time} />
                  </label>
                  {#if sub.time}
                    <label class="flex items-center justify-between gap-4">
                      <span>
                        <span class="block">Wichtig</span>
                        <span class="block text-small text-text-muted">
                          Ab der Uhrzeit immer wieder erinnern, bis abgehakt.
                        </span>
                      </span>
                      <select
                        class="field w-36"
                        value={sub.nag ?? 0}
                        onchange={(e) => (sub.nag = Number(e.currentTarget.value) || undefined)}
                      >
                        <option value={0}>Nein</option>
                        {#each INTERVALS.slice(1) as m (m)}
                          <option value={m}>{intervalLabel(m)}</option>
                        {/each}
                      </select>
                    </label>
                  {/if}
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
      <p class="text-small text-text-muted">
        Ohne Schritte wird die Routine als Ganzes abgehakt. Am Griff ziehen zum Sortieren.
        {#if !isNative}Erinnerungen kommen nur in der Android-App.{/if}
      </p>
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
