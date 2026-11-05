<script lang="ts">
  import { Bell, Pause, Play, SkipForward, Square, Trash2 } from '@lucide/svelte'
  import { plural } from '../lib/routines/format'
  import {
    formatClock,
    formatMinutes,
    MODE_LABEL,
    PHASE_LABEL,
    type FocusMode,
  } from '../lib/focus/timer'
  import { canNotify, permission, requestPermission } from '../lib/signals'
  import { app } from '../lib/state/app.svelte'
  import { clockTime, focus } from '../lib/state/focus.svelte'
  import { todosFor } from '../lib/todos/todos'
  import CheckCircle from '../components/ui/CheckCircle.svelte'
  import ProgressRing from '../components/ui/ProgressRing.svelte'
  import Segmented from '../components/ui/Segmented.svelte'

  let goal = $state('')
  let todoId = $state<string | undefined>(undefined)
  let perm = $state(permission())

  const run = $derived(focus.run)
  const phase = $derived(run?.phase ?? 'focus')
  const isBreak = $derived(phase !== 'focus')
  const phaseColor = $derived(isBreak ? 'var(--color-phase-break)' : 'var(--color-phase-focus)')
  const ratio = $derived(1 - focus.remaining / focus.duration)
  /** Ziel wird vor dem Takt festgelegt (noch kein Timer oder nächster Takt wartet). */
  const choosing = $derived(!run || run.status === 'ready')

  const openTodos = $derived(todosFor(app.todos, app.today, app.today).open.slice(0, 6))
  const linkedTodo = $derived(run?.todoId ? app.todos.find((t) => t.id === run.todoId) : undefined)

  const sessions = $derived(app.sessions.filter((s) => s.day === app.today))
  const todayMinutes = $derived(sessions.reduce((sum, s) => sum + s.minutes, 0))
  const deepMinutes = $derived(
    sessions.filter((s) => s.mode === 'deep').reduce((sum, s) => sum + s.minutes, 0),
  )

  const every = $derived(focus.profile.every)
  const filled = $derived.by(() => {
    if (!run) return 0
    const r = run.round % every
    return run.phase === 'long' && r === 0 ? every : r
  })

  const label = $derived(
    !run ? 'Bereit' : run.status === 'ready' ? 'Nächster Takt' : PHASE_LABEL[run.phase],
  )
  const hint = $derived.by(() => {
    if (!run) return `${MODE_LABEL[focus.mode]} · ${focus.profile.focus} min`
    if (run.status === 'paused') return 'Pausiert'
    if (run.status === 'ready') return `Takt ${(run.round % every) + 1} von ${every}`
    return `bis ${clockTime(run.endsAt)}`
  })

  function pickTodo(id: string, title: string) {
    if (todoId === id) {
      todoId = undefined
      goal = ''
    } else {
      todoId = id
      goal = title
    }
  }

  function begin() {
    const g = goal.trim() || undefined
    const t = g && todoId ? todoId : undefined
    if (run?.status === 'ready') focus.startNext(g, t)
    else focus.start(g, t)
    goal = ''
    todoId = undefined
  }

  function stop() {
    if (run && run.status !== 'ready' && run.phase === 'focus') {
      if (!confirm('Takt beenden? Die bisherige Zeit wird gespeichert.')) return
    }
    focus.stop()
  }

  async function enableNotifications() {
    perm = await requestPermission()
    if (perm === 'granted') app.updateSettings({ notify: true })
  }
</script>

<section class="flex flex-col gap-6">
  <header class="flex items-end justify-between gap-4">
    <div>
      <h1 class="text-title">Fokus</h1>
      <p class="text-small text-text-muted">
        {#if sessions.length}
          {plural(sessions.length, 'Takt', 'Takte')} heute · {formatMinutes(todayMinutes)}
        {:else}
          Noch kein Takt heute
        {/if}
      </p>
    </div>
  </header>

  {#if !run}
    <Segmented
      bind:value={() => focus.mode, (m: FocusMode) => focus.setMode(m)}
      label="Modus"
      options={[
        { value: 'deep' as FocusMode, label: 'Deep Work' },
        { value: 'normal' as FocusMode, label: 'Normal' },
      ]}
    />
  {/if}

  <div class="flex flex-col items-center gap-5">
    <div class="flex flex-col items-center gap-1 text-center">
      <p class="text-label transition-colors duration-250" style:color={phaseColor}>
        {label}{#if run}<span class="text-text-muted"> · {MODE_LABEL[run.mode]}</span>{/if}
      </p>
      <p class="text-small text-text-muted">{hint}</p>
    </div>

    <ProgressRing {ratio} size={280} stroke={6} color={phaseColor} linear>
      <div class="flex flex-col items-center">
        <span class="timer">{formatClock(focus.remaining)}</span>
        {#if run?.goal && !choosing}
          <span class="max-w-48 truncate text-small text-text-muted">{run.goal}</span>
        {/if}
      </div>
    </ProgressRing>

    <div class="flex gap-1.5" role="img" aria-label="{filled} von {every} Takten bis zur langen Pause">
      {#each Array.from({ length: every }, (_, i) => i) as i (i)}
        <span
          class={[
            'size-2.5 rounded-full transition-colors duration-250',
            i < filled ? 'bg-primary' : isBreak && i === filled ? 'bg-accent' : 'bg-border',
          ]}
        ></span>
      {/each}
    </div>
  </div>

  {#if choosing}
    <div class="flex flex-col gap-3">
      <label class="flex flex-col gap-1.5">
        <span class="text-label text-text-muted">Was ist das konkrete Ergebnis?</span>
        <input
          class="field bg-surface"
          bind:value={goal}
          placeholder="z. B. Abschnitt 3 entwerfen"
          oninput={() => (todoId = undefined)}
          onkeydown={(e) => e.key === 'Enter' && begin()}
        />
      </label>
      {#if openTodos.length}
        <div class="flex flex-wrap gap-2">
          {#each openTodos as todo (todo.id)}
            <button
              type="button"
              class={[
                'h-8 max-w-full truncate rounded-pill border px-3 text-small transition-colors',
                todoId === todo.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-text-muted hover:text-text',
              ]}
              onclick={() => pickTodo(todo.id, todo.title)}
            >
              {todo.title}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {:else if linkedTodo && run?.phase === 'focus'}
    <button
      type="button"
      class="flex min-h-11 items-center gap-3 self-center rounded-pill border border-border bg-surface px-4"
      onclick={() => app.toggleTodo(linkedTodo.id)}
    >
      <CheckCircle checked={!!linkedTodo.doneOn} size={20} />
      <span class={['text-small', linkedTodo.doneOn && 'text-text-muted line-through']}>
        {linkedTodo.title}
      </span>
    </button>
  {/if}

  <div class="flex items-center justify-center gap-3">
    {#if choosing}
      <button type="button" class="btn btn-primary" onclick={begin}>
        <Play size={20} /> {run ? 'Takt starten' : 'Starten'}
      </button>
    {:else if run?.status === 'running'}
      <button type="button" class="btn btn-primary" onclick={() => focus.pause()}>
        <Pause size={20} /> Pause
      </button>
      <button
        type="button"
        class="btn btn-secondary px-4"
        aria-label={isBreak ? 'Pause überspringen' : 'Takt beenden und Pause starten'}
        onclick={() => focus.skip()}
      >
        <SkipForward size={20} />
      </button>
    {:else}
      <button type="button" class="btn btn-primary" onclick={() => focus.resume()}>
        <Play size={20} /> Weiter
      </button>
    {/if}
    {#if run}
      <button type="button" class="btn btn-secondary px-4" aria-label="Beenden" onclick={stop}>
        <Square size={18} />
      </button>
    {/if}
  </div>

  {#if focus.toRate}
    {@const id = focus.toRate}
    <div class="flex flex-col gap-3 card">
      <p class="text-heading">Wie fokussiert war der Takt?</p>
      <div class="flex gap-2">
        {#each [1, 2, 3, 4, 5] as n (n)}
          <button
            type="button"
            class="h-11 flex-1 rounded-pill border border-border text-heading tabular-nums hover:border-primary hover:text-primary"
            onclick={() => {
              app.rateSession(id, n)
              focus.toRate = null
            }}
          >
            {n}
          </button>
        {/each}
      </div>
      <button
        type="button"
        class="self-start text-small text-text-muted underline"
        onclick={() => (focus.toRate = null)}
      >
        Später
      </button>
    </div>
  {/if}

  {#if canNotify && !app.settings.notify}
    <div class="flex items-center gap-3 card">
      <Bell size={20} class="shrink-0 text-primary" />
      <p class="flex-1 text-small text-text-muted">
        {#if perm === 'denied'}
          Benachrichtigungen sind im Browser blockiert. In den Website-Einstellungen erlauben.
        {:else}
          Signal am Blockende auch, wenn Takt im Hintergrund ist.
        {/if}
      </p>
      {#if perm !== 'denied'}
        <button type="button" class="btn btn-sm btn-secondary" onclick={enableNotifications}>
          Erlauben
        </button>
      {/if}
    </div>
  {/if}

  {#if sessions.length}
    <div class="flex flex-col gap-2 card">
      <div class="flex items-baseline justify-between">
        <h2 class="text-heading">Heute</h2>
        <span class="text-small text-text-muted">
          {#if deepMinutes}Deep Work {formatMinutes(deepMinutes)}{/if}
        </span>
      </div>
      <ul class="flex flex-col">
        {#each [...sessions].reverse() as s (s.id)}
          <li class="flex min-h-11 items-center gap-3 border-b border-border py-1.5 last:border-0">
            <span class="w-12 text-small text-text-muted tabular-nums">
              {clockTime(Date.parse(s.start))}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate">{s.goal ?? MODE_LABEL[s.mode]}</span>
              <span class="block text-small text-text-muted">
                {formatMinutes(s.minutes)}{s.goal ? ` · ${MODE_LABEL[s.mode]}` : ''}{s.complete
                  ? ''
                  : ' · abgebrochen'}{s.rating ? ` · Fokus ${s.rating}/5` : ''}
              </span>
            </span>
            <button
              type="button"
              class="grid size-9 place-items-center rounded-full text-text-muted hover:text-text"
              aria-label="Eintrag löschen"
              onclick={() => confirm('Eintrag löschen?') && app.deleteSession(s.id)}
            >
              <Trash2 size={16} />
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</section>

<style>
  .timer {
    /* Muss in den 280-px-Ring passen, daher kleiner als --text-timer. */
    font-size: min(var(--text-timer), 72px);
    font-weight: 300;
    letter-spacing: -0.02em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
</style>
