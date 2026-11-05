<script lang="ts">
  import { X } from '@lucide/svelte'
  import type { Snippet } from 'svelte'

  interface Props {
    open: boolean
    title: string
    children: Snippet
    footer?: Snippet
  }

  let { open = $bindable(), title, children, footer }: Props = $props()
  let dialog: HTMLDialogElement

  $effect(() => {
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  })
</script>

<dialog
  bind:this={dialog}
  class="sheet m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-clip rounded-t-lg bg-surface p-0 text-text shadow-card sm:m-auto sm:max-w-lg sm:rounded-lg"
  aria-label={title}
  onclose={() => (open = false)}
  onclick={(e) => e.target === dialog && (open = false)}
>
  <div class="flex max-h-[92dvh] flex-col">
    <header class="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
      <h2 class="text-heading">{title}</h2>
      <button
        type="button"
        class="-mr-2 grid size-11 place-items-center rounded-full text-text-muted hover:text-text"
        aria-label="Schließen"
        onclick={() => (open = false)}
      >
        <X size={22} />
      </button>
    </header>
    <div class="flex-1 overflow-y-auto px-5 py-5">
      {@render children()}
    </div>
    {#if footer}
      <footer class="border-t border-border px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        {@render footer()}
      </footer>
    {/if}
  </div>
</dialog>

<style>
  .sheet::backdrop {
    background: rgb(23 18 28 / 0.4);
  }
  .sheet[open] {
    animation: rise var(--duration-base) var(--ease);
  }
  @keyframes rise {
    from {
      transform: translateY(24px);
      opacity: 0;
    }
  }
</style>
