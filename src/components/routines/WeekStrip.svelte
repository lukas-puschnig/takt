<script lang="ts">
  import { fromKey, weekdayOf, weekdayShort, weekOf, type DateKey } from '../../lib/date'
  import { dayRatio } from '../../lib/routines/schedule'
  import { app } from '../../lib/state/app.svelte'
  import ProgressRing from '../ui/ProgressRing.svelte'

  interface Props {
    selected: DateKey
  }

  let { selected = $bindable() }: Props = $props()

  const days = $derived(weekOf(selected, app.settings.weekStart))
</script>

<div class="grid grid-cols-7 gap-1">
  {#each days as day (day)}
    {@const ratio = dayRatio(app.activeRoutines, day, app.logs)}
    {@const isSelected = day === selected}
    {@const isToday = day === app.today}
    <button
      type="button"
      class={[
        'flex flex-col items-center gap-1 rounded-md py-2 transition-colors duration-150',
        isSelected ? 'bg-surface shadow-card' : 'hover:bg-surface/60',
      ]}
      aria-pressed={isSelected}
      aria-label={fromKey(day).toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })}
      onclick={() => (selected = day)}
    >
      <span class={['text-label', isToday ? 'text-primary' : 'text-text-muted']}>
        {weekdayShort(weekdayOf(day))}
      </span>
      <ProgressRing ratio={day > app.today ? 0 : (ratio ?? 0)} size={34} stroke={3}>
        <span class={['text-small tabular-nums', ratio === null && 'text-text-muted']}>
          {fromKey(day).getDate()}
        </span>
      </ProgressRing>
    </button>
  {/each}
</div>
