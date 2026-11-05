<script lang="ts">
  import {
    Bell,
    CalendarClock,
    Coffee,
    Pause,
    Play,
    SkipForward,
    Square,
    Trash2,
  } from '@lucide/svelte'
  import DayPlanner from '../components/focus/DayPlanner.svelte'
  import TimerDial from '../components/focus/TimerDial.svelte'
  import CheckCircle from '../components/ui/CheckCircle.svelte'
  import Segmented from '../components/ui/Segmented.svelte'
  import { QUICK_MINUTES } from '../lib/focus/breaks'
  import type { DayPlan } from '../lib/focus/plan'
  import {
    clockTime,
    formatClock,
    formatMinutes,
    isFinished,
    MODE_LABEL,
    PHASE_LABEL,
    type FocusMode,
  } from '../lib/focus/timer'
  import { plural } from '../lib/routines/format'
  import { canNotify, permission, requestPermission } from '../lib/signals'
  import { app } from '../lib/state/app.svelte'
  import { focus } from '../lib/state/focus.svelte'
  import { todosFor } from '../lib/todos/todos'

  let goal = $state('')
  let todoId = $state<string | undefined>(undefined)
  let breakTask = $state('')
  let perm = $state(permission())
  let plannerOpen = $state(false)

  const run = $derived(focus.run)
  const finished = $derived(!!run && isFinished(run))
  const phase = $derived(run?.phase ?? 'focus')
  const isBreak = $derived(phase !== 'focus' && run?.status !== 'ready')
  const phaseColor = $derived(isBreak ? 'var(--color-phase-break)' : 'var(--color-phase-focus)')
  const ratio = $derived(focus.duration ? 1 - focus.remaining / focus.duration : 0)
  /** Ziel wird vor dem Takt festgelegt (noch kein Timer oder nächster Takt wartet). */
  const choosing = $derived((!run || run.status === 'ready') && !finished)
  /** Taktlänge lässt sich am Ring drehen, solange kein Plan läuft. */
  const adjustable = $derived(choosing && !run?.blocks)
  const minutes = $derived(Math.round(focus.duration / 60_000))

  const openTodos = $derived(todosFor(app.todos, app.today, app.today).open.slice(0, 6))
  const linkedTodo = $derived(run?.todoId ? app.todos.find((t) => t.id === run.todoId) : undefined)

  const sessions = $derived(app.sessions.filter((s) => s.day === app.today))
  const todayMinutes = $derived(sessions.reduce((sum, s) => sum + s.minutes, 0))
  const deepMinutes = $derived(
    sessions.filter((s) => s.mode === 'deep').reduce((sum, s) => sum + s.minutes, 0),
  )

  // Rundenpunkte: beim Tagesplan alle Takte, sonst bis zur langen Pause.
  const dots = $derived(run?.blocks ? run.blocks.length : focus.profile.every)
  const filled = $derived.by(() => {
    if (!run) return 0
    if (run.blocks) return run.round
    const r = run.round % dots
    return run.phase === 'long' && r === 0 ? dots : r
  })

  const label = $derived.by(() => {
    if (!run) return 'Bereit'
    if (finished) return 'Geschafft'
    if (run.status === 'ready') return 'Nächster Takt'
    return PHASE_LABEL[run.phase]
  })
  const hint = $derived.by(() => {
    if (!run) return `${MODE_LABEL[focus.mode]} · bis ${clockTime(focus.now + focus.duration)}`
    if (finished) return 'Tagesplan abgeschlossen'
    if (run.status === 'paused') return 'Pausiert'
    if (run.status === 'ready')
      return `Takt ${run.round + 1} · bis ${clockTime(focus.now + focus.duration)}`
    const planEnd = run.blocks
      ? ` · Takt ${Math.min(run.round + (run.phase === 'focus' ? 1 : 0), dots)} von ${dots}`
      : ''
    return `bis ${clockTime(run.endsAt)}${planEnd}`
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

  function options() {
    const g = goal.trim() || undefined
    return {
      goal: g,
      todoId: g && todoId ? todoId : undefined,
      breakTask: breakTask.trim() || undefined,
    }
  }

  function reset() {
    goal = ''
    todoId = undefined
    breakTask = ''
  }

  function begin() {
    if (run?.status === 'ready') focus.startNext(options())
    else focus.start(options())
    reset()
  }

  function startPlan(plan: DayPlan) {
    focus.startPlan(plan, options())
    reset()
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

  const chip = (active: boolean) => [
    'h-8 max-w-full truncate rounded-pill border px-3 text-small transition-colors',
    active
      ? 'border-primary bg-primary/10 text-primary'
      : 'border-border text-text-muted hover:text-text',
  ]
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
    {#if !run}
      <button type="button" class="btn btn-sm btn-secondary" onclick={() => (plannerOpen = true)}>
        <CalendarClock size={16} /> Tag planen
      </button>
    {/if}
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
        {label}{#if run && !finished}<span class="text-text-muted">
            · {run.blocks ? 'Tagesplan' : MODE_LABEL[run.mode]}</span
          >{/if}
      </p>
      <p class="text-small text-text-muted">{hint}</p>
    </div>

    <TimerDial
      {ratio}
      color={phaseColor}
      {adjustable}
      {minutes}
      onchange={(m) => focus.setMinutes(m)}
    >
      <div class="flex flex-col items-center gap-1 px-6 text-center">
        <!-- Ab 100:00 (dreistellig) kleiner, damit die Zeit in den Ring passt -->
        <span class={['timer', Math.ceil(focus.remaining / 1000) >= 6000 && 'long']}>
          {formatClock(focus.remaining)}
        </span>
        {#if isBreak && run?.breakTask}
          <span class="flex items-center gap-1 text-small text-text">
            <Coffee size={14} class="shrink-0 text-accent" />{run.breakTask}
          </span>
        {:else if run?.goal && !choosing}
          <span class="max-w-48 truncate text-small text-text-muted">{run.goal}</span>
        {:else if adjustable}
          <span class="text-small text-text-muted">Ring drehen</span>
        {/if}
      </div>
    </TimerDial>

    {#if adjustable}
      <div class="flex flex-wrap justify-center gap-2" role="group" aria-label="Taktlänge">
        {#each QUICK_MINUTES as m (m)}
          <button type="button" class={chip(minutes === m)} onclick={() => focus.setMinutes(m)}>
            {m} min
          </button>
        {/each}
      </div>
    {:else}
      <div class="flex gap-1.5" role="img" aria-label="{filled} von {dots} Takten">
        {#each Array.from({ length: dots }, (_, i) => i) as i (i)}
          <span
            class={[
              'size-2.5 rounded-full transition-colors duration-250',
              i < filled ? 'bg-primary' : isBreak && i === filled ? 'bg-accent' : 'bg-border',
            ]}
          ></span>
        {/each}
      </div>
    {/if}
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
              class={chip(todoId === todo.id)}
              onclick={() => pickTodo(todo.id, todo.title)}
            >
              {todo.title}
            </button>
          {/each}
        </div>
      {/if}
    </div>
    <div class="flex flex-col gap-3">
      <label class="flex flex-col gap-1.5">
        <span class="text-label text-text-muted">Und in der Pause danach?</span>
        <input class="field bg-surface" bind:value={breakTask} placeholder="z. B. Seated Twist" />
      </label>
      <div class="flex flex-wrap gap-2">
        {#each app.settings.breakIdeas as idea (idea)}
          <button
            type="button"
            class={chip(breakTask === idea)}
            onclick={() => (breakTask = breakTask === idea ? '' : idea)}
          >
            {idea}
          </button>
        {/each}
      </div>
    </div>
  {:else if run && !finished && run.phase === 'focus'}
    {#if linkedTodo}
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
    <label
      class="flex items-center gap-2 self-center rounded-pill border border-border bg-surface px-4"
    >
      <Coffee size={16} class="shrink-0 text-accent" />
      <input
        class="min-h-11 w-56 bg-transparent text-small outline-none placeholder:text-text-muted"
        value={run.breakTask ?? ''}
        placeholder="In der Pause: …"
        aria-label="Was in der Pause passiert"
        onchange={(e) => focus.setBreakTask(e.currentTarget.value.trim())}
      />
    </label>
  {/if}

  <div class="flex items-center justify-center gap-3">
    {#if finished}
      <button type="button" class="btn btn-primary" onclick={() => focus.stop()}>Fertig</button>
    {:else if choosing}
      <button type="button" class="btn btn-primary" onclick={begin}>
        <Play size={20} />
        {run ? 'Takt starten' : 'Starten'}
      </button>
    {:else if run?.status === 'running'}
      <button type="button" class="btn btn-primary" onclick={() => focus.pause()}>
        <Pause size={20} /> Pause
      </button>
      <button
        type="button"
        class="btn px-4 btn-secondary"
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
    {#if run && !finished}
      <button type="button" class="btn px-4 btn-secondary" aria-label="Beenden" onclick={stop}>
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

<DayPlanner bind:open={plannerOpen} onstart={startPlan} />

<style>
  .timer {
    /* Muss in den 280-px-Ring passen, daher kleiner als --text-timer. */
    font-size: min(var(--text-timer), 72px);
    font-weight: 300;
    letter-spacing: -0.02em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .timer.long {
    font-size: min(var(--text-timer), 56px);
  }
</style>
