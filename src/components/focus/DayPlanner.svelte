<script lang="ts">
  import { Play } from '@lucide/svelte'
  import { defaultWindow, planDay, timeOnDay, type DayPlan } from '../../lib/focus/plan'
  import { clockTime, formatMinutes } from '../../lib/focus/timer'
  import { plural } from '../../lib/routines/format'
  import { app } from '../../lib/state/app.svelte'
  import Sheet from '../ui/Sheet.svelte'

  interface Props {
    open: boolean
    onstart: (plan: DayPlan) => void
  }

  let { open = $bindable(), onstart }: Props = $props()

  let from = $state('')
  let to = $state('')
  let deep = $state(70)
  let openedAt = $state(Date.now())

  // Beim Öffnen: ab jetzt bis in drei Stunden.
  $effect(() => {
    if (!open) return
    openedAt = Date.now()
    ;({ from, to } = defaultWindow(openedAt))
  })

  const plan = $derived.by(() => {
    if (!/^\d{2}:\d{2}$/.test(from) || !/^\d{2}:\d{2}$/.test(to)) return null
    // Liegt „bis“ vor „von“, ist der nächste Tag gemeint.
    const start = timeOnDay(from, openedAt)
    return planDay(start, timeOnDay(to, openedAt, start), deep / 100, app.settings.profiles)
  })

  const pauseMs = $derived(
    plan
      ? plan.slots.filter((s) => s.kind !== 'focus').reduce((n, s) => n + s.end - s.start, 0)
      : 0,
  )
  const startsLater = $derived(!!plan?.slots.length && plan.slots[0].start > openedAt + 120_000)
  const total = $derived(plan?.slots.length ? plan.slots.at(-1)!.end - plan.slots[0].start : 0)

  const slotLabel = (kind: string) =>
    kind === 'focus' ? 'Fokus' : kind === 'long' ? 'Lange Pause' : 'Pause'
</script>

<Sheet bind:open title="Tag planen">
  <div class="flex flex-col gap-6">
    <div class="grid grid-cols-2 gap-3">
      <label class="flex flex-col gap-1.5">
        <span class="text-label text-text-muted">Von</span>
        <input class="field" type="time" bind:value={from} />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-label text-text-muted">Bis</span>
        <input class="field" type="time" bind:value={to} />
      </label>
    </div>

    <label class="flex flex-col gap-2">
      <span class="flex items-baseline justify-between">
        <span class="text-label text-text-muted">Art der Arbeit</span>
        <span class="text-small tabular-nums">{deep} % Deep Work</span>
      </span>
      <input
        type="range"
        min="0"
        max="100"
        step="5"
        bind:value={deep}
        class="w-full accent-primary"
      />
      <span class="flex justify-between text-small text-text-muted">
        <span>Light · kurze Takte</span><span>Deep · lange Takte</span>
      </span>
    </label>

    {#if plan && plan.blocks.length}
      <div class="flex flex-col gap-3">
        <p class="text-small text-text-muted">
          {plural(plan.blocks.length, 'Takt', 'Takte')} · {formatMinutes(plan.focusMs / 60_000)} Fokus
          · {formatMinutes(pauseMs / 60_000)} Pause
        </p>
        <!-- Zeitleiste: Breite proportional zur Dauer -->
        <div class="flex h-3 overflow-hidden rounded-pill" aria-hidden="true">
          {#each plan.slots as s (s.start)}
            <span
              class={s.kind === 'focus' ? 'bg-primary' : 'bg-accent'}
              style:flex-grow={(s.end - s.start) / total}
              style:margin-right="2px"
            ></span>
          {/each}
        </div>
        <ol class="flex flex-col">
          {#each plan.slots as s, i (s.start)}
            <li
              class="flex min-h-10 items-center gap-3 border-b border-border text-small last:border-0"
            >
              <span class={['size-2 rounded-full', s.kind === 'focus' ? 'bg-primary' : 'bg-accent']}
              ></span>
              <span class="w-24 text-text-muted tabular-nums">
                {clockTime(s.start)}–{clockTime(s.end)}
              </span>
              <span class="flex-1">
                {slotLabel(s.kind)}{s.kind === 'focus'
                  ? ` ${plan.slots.slice(0, i + 1).filter((x) => x.kind === 'focus').length}`
                  : ''}
              </span>
              <span class="text-text-muted tabular-nums">
                {formatMinutes((s.end - s.start) / 60_000)}
              </span>
            </li>
          {/each}
        </ol>
        {#if startsLater}
          <p class="text-small text-text-muted">
            Der Plan startet sofort; die Uhrzeiten verschieben sich entsprechend.
          </p>
        {/if}
      </div>
      <button
        type="button"
        class="btn btn-primary"
        onclick={() => {
          onstart(plan)
          open = false
        }}
      >
        <Play size={20} /> Plan starten
      </button>
    {:else}
      <p class="text-small text-text-muted">Das Zeitfenster ist zu kurz für einen Takt.</p>
    {/if}
  </div>
</Sheet>
