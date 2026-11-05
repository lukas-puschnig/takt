<script lang="ts">
  import { CalendarDays } from '@lucide/svelte'
  import { addDays, type DateKey } from '../../lib/date'
  import { relativeDay } from '../../lib/todos/todos'

  interface Props {
    /** null = irgendwann */
    value: DateKey | null
    today: DateKey
  }

  let { value = $bindable(), today }: Props = $props()

  const tomorrow = $derived(addDays(today, 1))
  const custom = $derived(!!value && value !== today && value !== tomorrow)

  const chip = (active: boolean) => [
    'relative inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-small transition-colors duration-150',
    active
      ? 'border-primary bg-primary/10 text-primary'
      : 'border-border text-text-muted hover:text-text',
  ]
  // Fokus im Eingabefeld behalten, damit man direkt weitertippen kann.
  const keepFocus = (e: PointerEvent) => e.preventDefault()
</script>

<div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Tag">
  <button
    type="button"
    role="radio"
    aria-checked={value === today}
    class={chip(value === today)}
    onpointerdown={keepFocus}
    onclick={() => (value = today)}>Heute</button
  >
  <button
    type="button"
    role="radio"
    aria-checked={value === tomorrow}
    class={chip(value === tomorrow)}
    onpointerdown={keepFocus}
    onclick={() => (value = tomorrow)}>Morgen</button
  >
  <label class={chip(custom)}>
    <CalendarDays size={14} />
    {custom ? relativeDay(value, today) : 'Datum'}
    <input
      type="date"
      class="absolute inset-0 cursor-pointer opacity-0"
      aria-label="Datum wählen"
      min={today}
      value={custom ? value : ''}
      onclick={(e) => {
        try {
          e.currentTarget.showPicker()
        } catch {
          /* Picker öffnet sich je nach Browser ohnehin von selbst */
        }
      }}
      onchange={(e) => e.currentTarget.value && (value = e.currentTarget.value)}
    />
  </label>
  <button
    type="button"
    role="radio"
    aria-checked={value === null}
    class={chip(value === null)}
    onpointerdown={keepFocus}
    onclick={() => (value = null)}>Irgendwann</button
  >
</div>
