<script lang="ts">
  import { ArrowUp, Bell, Plus } from '@lucide/svelte'
  import type { DateKey } from '../../lib/date'
  import { app } from '../../lib/state/app.svelte'
  import { parseQuickAdd } from '../../lib/todos/todos'
  import DayChips from './DayChips.svelte'

  interface Props {
    /** Vorgabe, solange weder Tageswort noch Chip gewählt ist. */
    defaultDay: DateKey | null
  }

  let { defaultDay }: Props = $props()

  let text = $state('')
  /** Per Chip gewählter Tag; undefined = Vorgabe nutzen. */
  let manual = $state<DateKey | null | undefined>(undefined)
  let focused = $state(false)
  let container: HTMLFormElement
  let input: HTMLInputElement

  // Wechselt man den Tag in der Wochenleiste, gilt wieder dessen Vorgabe.
  $effect(() => {
    void defaultDay
    manual = undefined
  })

  const parsed = $derived(parseQuickAdd(text, app.today, app.settings.weekStart))
  const day = $derived(
    parsed.day !== undefined ? parsed.day : manual !== undefined ? manual : defaultDay,
  )
  const expanded = $derived(focused || text.length > 0)

  function pick(value: DateKey | null) {
    // Ein getipptes Tageswort wird durch den Chip ersetzt.
    if (parsed.day !== undefined) text = parsed.title
    manual = value
  }

  function submit(e: SubmitEvent) {
    e.preventDefault()
    if (!parsed.title) return
    app.addTodo(parsed.title, day, parsed.time)
    text = ''
    input.focus()
  }
</script>

<form
  bind:this={container}
  class="flex flex-col gap-3"
  onsubmit={submit}
  onfocusin={() => (focused = true)}
  onfocusout={() => setTimeout(() => (focused = container.contains(document.activeElement)), 0)}
>
  <div class="flex items-center gap-2">
    <Plus size={20} class="shrink-0 text-text-muted" />
    <input
      bind:this={input}
      bind:value={text}
      class="field flex-1 border-transparent bg-bg"
      placeholder="Aufgabe hinzufügen"
      aria-label="Neue Aufgabe"
      enterkeyhint="done"
      autocomplete="off"
    />
    {#if parsed.title}
      <button
        type="submit"
        class="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-on-primary"
        aria-label="Hinzufügen"
      >
        <ArrowUp size={20} />
      </button>
    {/if}
  </div>
  {#if expanded}
    <div class="flex flex-col gap-2 pl-7">
      <DayChips bind:value={() => day, pick} today={app.today} />
      {#if parsed.time}
        <p class="flex items-center gap-1.5 text-small text-primary">
          <Bell size={14} /> Erinnerung um {parsed.time}
        </p>
      {:else if !text}
        <p class="text-small text-text-muted">
          Tipp: „morgen“, „fr“, „12.11.“ oder „um 9“ dazuschreiben.
        </p>
      {/if}
    </div>
  {/if}
</form>
