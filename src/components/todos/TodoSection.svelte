<script lang="ts">
  import { ChevronDown } from '@lucide/svelte'
  import type { DateKey } from '../../lib/date'
  import { app } from '../../lib/state/app.svelte'
  import { somedayTodos, todosFor } from '../../lib/todos/todos'
  import type { Todo } from '../../lib/todos/types'
  import QuickAdd from './QuickAdd.svelte'
  import TodoEditor from './TodoEditor.svelte'
  import TodoItem from './TodoItem.svelte'

  interface Props {
    day: DateKey
  }

  let { day }: Props = $props()

  let editing = $state<Todo | null>(null)
  let editorOpen = $state(false)
  let showSomeday = $state(false)

  const list = $derived(todosFor(app.todos, day, app.today))
  const someday = $derived(somedayTodos(app.todos))
  const past = $derived(day < app.today)

  function edit(todo: Todo) {
    editing = todo
    editorOpen = true
  }
</script>

<section class="flex flex-col gap-2 card pt-4 pb-3">
  <div class="flex items-center justify-between">
    <h2 class="text-label text-text-muted">Aufgaben</h2>
    {#if list.open.length || list.done.length}
      <span class="text-label text-text-muted tabular-nums">
        {list.done.length} / {list.open.length + list.done.length}
      </span>
    {/if}
  </div>

  {#if !past}
    <QuickAdd defaultDay={day} />
  {/if}

  {#if list.open.length || list.done.length}
    <ul class="-ml-2.5 flex flex-col">
      {#each list.open as todo (todo.id)}
        <TodoItem {todo} {day} onedit={edit} />
      {/each}
      {#each list.done as todo (todo.id)}
        <TodoItem {todo} {day} onedit={edit} />
      {/each}
    </ul>
  {:else if past}
    <p class="py-2 text-small text-text-muted">An diesem Tag nichts abgehakt.</p>
  {/if}

  {#if !past && someday.length}
    <button
      type="button"
      class="flex min-h-11 items-center gap-2 text-label text-text-muted"
      aria-expanded={showSomeday}
      onclick={() => (showSomeday = !showSomeday)}
    >
      Irgendwann ({someday.length})
      <ChevronDown size={16} class={['transition-transform', showSomeday && 'rotate-180']} />
    </button>
    {#if showSomeday}
      <ul class="-ml-2.5 flex flex-col">
        {#each someday as todo (todo.id)}
          <TodoItem {todo} {day} onedit={edit} />
        {/each}
      </ul>
    {/if}
  {/if}
</section>

<TodoEditor bind:open={editorOpen} todo={editing} />
