<script lang="ts">
  import { orderedWeekdays, weekdayLong, weekdayShort, type Weekday } from '../../lib/date'

  interface Props {
    value: Weekday[]
    weekStart: Weekday
    size?: 'md' | 'sm'
  }

  let { value = $bindable(), weekStart, size = 'md' }: Props = $props()

  function toggle(day: Weekday) {
    value = value.includes(day) ? value.filter((d) => d !== day) : [...value, day]
  }
</script>

<div class="flex gap-1.5" role="group" aria-label="Wochentage">
  {#each orderedWeekdays(weekStart) as day (day)}
    {@const on = value.includes(day)}
    <button
      type="button"
      class={[
        'grid flex-1 place-items-center rounded-pill border font-semibold transition-colors duration-150',
        size === 'md' ? 'h-11 text-sm' : 'h-8 text-xs',
        on
          ? 'border-primary bg-primary text-on-primary'
          : 'border-border bg-surface text-text-muted',
      ]}
      aria-pressed={on}
      aria-label={weekdayLong(day)}
      onclick={() => toggle(day)}
    >
      {weekdayShort(day)}
    </button>
  {/each}
</div>
