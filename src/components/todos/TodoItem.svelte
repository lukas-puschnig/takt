<script lang="ts">
  import type { DateKey } from '../../lib/date'
  import { app } from '../../lib/state/app.svelte'
  import { relativeDay } from '../../lib/todos/todos'
  import type { Todo } from '../../lib/todos/types'
  import CheckCircle from '../ui/CheckCircle.svelte'

  interface Props {
    todo: Todo
    /** Angezeigter Tag (bestimmt, wann abgehakt wird). */
    day: DateKey
    onedit: (todo: Todo) => void
  }

  let { todo, day, onedit }: Props = $props()

  const done = $derived(!!todo.doneOn)
  const overdue = $derived(!done && !!todo.day && todo.day < app.today)
</script>

<li class="flex min-h-11 items-center gap-1">
  <button
    type="button"
    class="grid size-11 shrink-0 place-items-center rounded-full"
    aria-pressed={done}
    aria-label={done ? `${todo.title} wieder öffnen` : `${todo.title} abhaken`}
    onclick={() => app.toggleTodo(todo.id, day)}
  >
    <CheckCircle checked={done} size={22} />
  </button>
  <button
    type="button"
    class="min-w-0 flex-1 py-1.5 text-left"
    aria-label={`${todo.title} bearbeiten`}
    onclick={() => onedit(todo)}
  >
    <span class={['block transition-colors', done && 'text-text-muted line-through']}>
      {todo.title}
    </span>
    {#if overdue || todo.notes}
      <span class="flex gap-2 text-small text-text-muted">
        {#if overdue}
          {@const since = relativeDay(todo.day, app.today)}
          <span class="text-primary">Seit {since === 'Gestern' ? 'gestern' : since}</span>
        {/if}
        {#if todo.notes}<span class="truncate">{todo.notes}</span>{/if}
      </span>
    {/if}
  </button>
</li>
