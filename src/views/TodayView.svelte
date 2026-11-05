<script lang="ts">
  import { ChevronDown, Plus } from '@lucide/svelte'
  import { addDays, formatLongDate } from '../lib/date'
  import { isDue, progress } from '../lib/routines/schedule'
  import type { Routine } from '../lib/routines/types'
  import { app } from '../lib/state/app.svelte'
  import RoutineCard from '../components/routines/RoutineCard.svelte'
  import RoutineEditor from '../components/routines/RoutineEditor.svelte'
  import WeekStrip from '../components/routines/WeekStrip.svelte'
  import TodoSection from '../components/todos/TodoSection.svelte'

  let editorOpen = $state(false)
  let editing = $state<Routine | null>(null)
  let showNotDue = $state(false)

  const day = $derived(app.selectedDay)
  const due = $derived(app.activeRoutines.filter((r) => isDue(r, day)))
  const notDue = $derived(app.activeRoutines.filter((r) => !isDue(r, day)))
  const totals = $derived(
    due.reduce(
      (acc, r) => {
        const log = app.logFor(r.id, day)
        acc.routines += log?.complete ? 1 : 0
        const p = progress(r, day, log)
        acc.done += p.done
        acc.total += p.total
        return acc
      },
      { routines: 0, done: 0, total: 0 },
    ),
  )

  const heading = $derived.by(() => {
    if (day === app.today) return 'Heute'
    if (day === addDays(app.today, -1)) return 'Gestern'
    if (day === addDays(app.today, 1)) return 'Morgen'
    return formatLongDate(day).split(',')[0]
  })

  function edit(routine: Routine | null) {
    editing = routine
    editorOpen = true
  }
</script>

<section class="flex flex-col gap-5">
  <header class="flex items-end justify-between gap-4">
    <div>
      <h1 class="text-title">{heading}</h1>
      <p class="text-small text-text-muted">{formatLongDate(day)}</p>
    </div>
    {#if day !== app.today}
      <button
        type="button"
        class="btn btn-sm btn-secondary"
        onclick={() => (app.selectedDay = app.today)}
      >
        Zu heute
      </button>
    {/if}
  </header>

  <WeekStrip bind:selected={app.selectedDay} />

  <TodoSection {day} />

  {#if app.activeRoutines.length === 0}
    <div class="flex flex-col items-start gap-4 card py-8">
      <p class="text-title">Noch keine <em class="text-primary">Routinen</em>.</p>
      <p class="text-text-muted">
        Leg Blöcke wie „Morgens“ oder „Abends“ an und füll sie mit kleinen Schritten.
      </p>
      <button type="button" class="btn btn-primary" onclick={() => edit(null)}>
        <Plus size={20} /> Routine anlegen
      </button>
    </div>
  {:else}
    <div class="flex items-center justify-between">
      <p class="text-label text-text-muted">
        {#if due.length}
          Routinen · {totals.routines} von {due.length}
        {:else}
          Routinen · nichts fällig
        {/if}
      </p>
      {#if day > app.today}
        <p class="text-label text-text-muted">Vorschau</p>
      {/if}
    </div>

    <div class="flex flex-col gap-3">
      {#each due as routine (`${routine.id}:${day}`)}
        <RoutineCard {routine} {day} onedit={edit} />
      {/each}
    </div>

    {#if due.length && totals.routines === due.length && day <= app.today}
      <p class="text-center text-text-muted">
        Alles erledigt. <em class="font-display text-[20px] text-primary">Schön.</em>
      </p>
    {/if}

    {#if notDue.length}
      <div class="flex flex-col gap-3">
        <button
          type="button"
          class="flex min-h-11 items-center gap-2 text-label text-text-muted"
          aria-expanded={showNotDue}
          onclick={() => (showNotDue = !showNotDue)}
        >
          Nicht fällig ({notDue.length})
          <ChevronDown size={16} class={['transition-transform', showNotDue && 'rotate-180']} />
        </button>
        {#if showNotDue}
          {#each notDue as routine (`${routine.id}:${day}`)}
            <RoutineCard {routine} {day} onedit={edit} />
          {/each}
        {/if}
      </div>
    {/if}

    <button type="button" class="btn self-center btn-secondary" onclick={() => edit(null)}>
      <Plus size={20} /> Routine
    </button>
  {/if}
</section>

<RoutineEditor bind:open={editorOpen} routine={editing} />
