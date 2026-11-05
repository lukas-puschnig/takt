<script lang="ts">
  import { BellRing, ChevronDown, Clock, Flame, Pencil } from '@lucide/svelte'
  import { slide } from 'svelte/transition'
  import type { DateKey } from '../../lib/date'
  import { partialColor, routineColor } from '../../lib/routines/colors'
  import { describeDays, describeSchedule } from '../../lib/routines/format'
  import { isDue, progress, streak, subtasksFor } from '../../lib/routines/schedule'
  import { SELF, type Routine } from '../../lib/routines/types'
  import { app } from '../../lib/state/app.svelte'
  import CheckCircle from '../ui/CheckCircle.svelte'
  import ProgressRing from '../ui/ProgressRing.svelte'

  interface Props {
    routine: Routine
    day: DateKey
    onedit: (routine: Routine) => void
  }

  let { routine, day, onedit }: Props = $props()

  const log = $derived(app.logFor(routine.id, day))
  const due = $derived(isDue(routine, day))
  const subtasks = $derived(subtasksFor(routine, day))
  const p = $derived(progress(routine, day, log))
  const complete = $derived(!!log?.complete)
  const color = $derived(routineColor(routine.color))
  /** Pflicht erledigt, aber optionale Schritte offen: Ring voll, aber blasser. */
  const optionalOpen = $derived(p.optionalTotal - p.optionalDone)
  const ringColor = $derived(complete && optionalOpen ? partialColor(color) : color)
  const streakCount = $derived(streak(routine, app.today, app.logs))
  // Zukünftige Tage sind nur Vorschau, nicht fällige Tage nur Info.
  const locked = $derived(day > app.today || !due)

  let manualOpen = $state<boolean | null>(null)
  const open = $derived(manualOpen ?? (due && !(complete && app.settings.collapseDone)))

  const isDone = (id: string) => !!log?.done.includes(id)
</script>

<article class={['card transition-opacity duration-250', !due && 'opacity-60']}>
  <div class="flex items-center gap-3">
    {#if subtasks.length}
      <button
        type="button"
        class="shrink-0 rounded-full disabled:cursor-default"
        disabled={locked}
        aria-label={complete
          ? `${routine.title} zurücksetzen`
          : `${routine.title} komplett abhaken`}
        onclick={() => app.setRoutineDone(routine, day, !complete)}
      >
        <ProgressRing ratio={p.ratio} size={44} stroke={4} color={ringColor}>
          {#if complete && optionalOpen}
            <span class="text-small text-text-muted tabular-nums" title="Optionale Schritte offen">
              +{optionalOpen}
            </span>
          {:else if complete}
            <CheckCircle checked size={30} {color} />
          {:else}
            <span class="text-small text-text-muted tabular-nums">{p.done}/{p.total}</span>
          {/if}
        </ProgressRing>
      </button>
    {:else}
      <button
        type="button"
        class="grid size-11 shrink-0 place-items-center rounded-full disabled:cursor-default"
        disabled={locked}
        aria-label={`${routine.title} abhaken`}
        aria-pressed={isDone(SELF)}
        onclick={() => app.toggle(routine, day, SELF)}
      >
        <CheckCircle checked={isDone(SELF)} size={32} {color} />
      </button>
    {/if}

    <button
      type="button"
      class="min-w-0 flex-1 text-left"
      aria-expanded={open}
      onclick={() => (manualOpen = !open)}
    >
      <h3 class={['truncate text-heading transition-colors', complete && 'text-text-muted']}>
        {routine.title}
      </h3>
      <p class="flex flex-wrap items-center gap-x-3 text-small text-text-muted">
        {#if routine.time}
          <span class="inline-flex items-center gap-1"><Clock size={13} />{routine.time}</span>
        {/if}
        {#if !due}
          <span>{describeSchedule(routine.schedule, app.settings.weekStart)}</span>
        {/if}
        {#if streakCount > 1}
          <span class="inline-flex items-center gap-1">
            <Flame size={13} class="text-accent" />{streakCount} in Folge
          </span>
        {/if}
      </p>
    </button>

    <button
      type="button"
      class="grid size-11 shrink-0 place-items-center rounded-full text-text-muted hover:text-text"
      aria-label={`${routine.title} bearbeiten`}
      onclick={() => onedit(routine)}
    >
      <Pencil size={18} />
    </button>
    {#if subtasks.length}
      <button
        type="button"
        class="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-text-muted hover:text-text"
        aria-label={open ? 'Einklappen' : 'Aufklappen'}
        onclick={() => (manualOpen = !open)}
      >
        <ChevronDown
          size={20}
          class={['transition-transform duration-250', open && 'rotate-180']}
        />
      </button>
    {/if}
  </div>

  {#if open && subtasks.length}
    <ul class="mt-3 border-t border-border pt-1" transition:slide={{ duration: 200 }}>
      {#each subtasks as sub (sub.id)}
        {@const done = isDone(sub.id)}
        <li>
          <button
            type="button"
            class="flex min-h-11 w-full items-center gap-3 py-1.5 text-left disabled:cursor-default"
            disabled={locked}
            aria-pressed={done}
            onclick={() => app.toggle(routine, day, sub.id)}
          >
            <CheckCircle checked={done} size={22} {color} dashed={sub.optional} />
            <span class={['flex-1 transition-colors', done && 'text-text-muted line-through']}>
              {#if sub.emoji}<span class="mr-1">{sub.emoji}</span>{/if}{sub.title}
            </span>
            <span class="flex shrink-0 items-center gap-2 text-small text-text-muted">
              {#if sub.optional}<span>optional</span>{/if}
              {#if sub.time}
                <span class={['inline-flex items-center gap-1', sub.nag && !done && 'text-text']}>
                  {#if sub.nag}<BellRing size={13} />{:else}<Clock size={13} />{/if}{sub.time}
                </span>
              {/if}
              {#if sub.days?.length}
                <span>{describeDays(sub.days, app.settings.weekStart)}</span>
              {/if}
            </span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if routine.notes && open}
    <p class="mt-2 text-small whitespace-pre-line text-text-muted">{routine.notes}</p>
  {/if}
</article>
