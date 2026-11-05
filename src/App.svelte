<script lang="ts">
  import { ListChecks, Settings, Timer } from '@lucide/svelte'
  import { setLucideProps } from '@lucide/svelte'
  import markDark from './assets/brand/takt-mark-dark.svg'
  import markLight from './assets/brand/takt-mark-light.svg'
  import { formatClock } from './lib/focus/timer'
  import { app } from './lib/state/app.svelte'
  import { focus } from './lib/state/focus.svelte'
  import FocusView from './views/FocusView.svelte'
  import SettingsView from './views/SettingsView.svelte'
  import TodayView from './views/TodayView.svelte'

  // Icons nach DESIGN.md: Konturen mit 1,75 px Strich.
  setLucideProps({ strokeWidth: 1.75 })

  const tabs = [
    { id: 'heute', label: 'Heute', icon: ListChecks },
    { id: 'fokus', label: 'Fokus', icon: Timer },
    { id: 'einstellungen', label: 'Einstellungen', icon: Settings },
  ] as const
  type Tab = (typeof tabs)[number]['id']

  const parseHash = (): Tab => {
    const id = location.hash.replace(/^#\/?/, '')
    return tabs.find((t) => t.id === id)?.id ?? 'heute'
  }
  let tab = $state<Tab>(parseHash())

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
  let systemDark = $state(prefersDark.matches)
  prefersDark.addEventListener('change', (e) => (systemDark = e.matches))
  const dark = $derived(
    app.settings.theme === 'dark' || (app.settings.theme === 'system' && systemDark),
  )

  // Tipp auf eine Benachrichtigung: der Service Worker bittet um den passenden Tab.
  navigator.serviceWorker?.addEventListener('message', (e) => {
    if (e.data?.type === 'takt:navigate' && typeof e.data.hash === 'string')
      location.hash = e.data.hash
  })

  const timerBadge = $derived(
    focus.run && focus.run.status !== 'ready' ? formatClock(focus.remaining) : null,
  )

  $effect(() => {
    const root = document.documentElement
    if (app.settings.theme === 'system') root.removeAttribute('data-theme')
    else root.dataset.theme = app.settings.theme
  })
</script>

<svelte:window onhashchange={() => (tab = parseHash())} />

<div class="mx-auto flex min-h-dvh max-w-xl flex-col px-4 pt-[max(16px,env(safe-area-inset-top))]">
  <header class="flex h-14 items-center gap-2.5">
    <img src={dark ? markDark : markLight} alt="" aria-hidden="true" class="size-8" />
    <span class="font-display text-[28px] leading-none">Takt</span>
  </header>

  <main class="flex-1 pt-4 pb-28">
    {#if tab === 'heute'}
      <TodayView />
    {:else if tab === 'fokus'}
      <FocusView />
    {:else}
      <SettingsView />
    {/if}
  </main>
</div>

<nav
  class="fixed inset-x-0 bottom-0 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
  aria-label="Hauptnavigation"
>
  <ul class="mx-auto flex max-w-xl">
    {#each tabs as t (t.id)}
      {@const Icon = t.icon}
      <li class="flex-1">
        <a
          href="#/{t.id}"
          class={[
            'flex h-16 flex-col items-center justify-center gap-1 text-small transition-colors',
            tab === t.id ? 'text-primary' : 'text-text-muted',
          ]}
          aria-current={tab === t.id ? 'page' : undefined}
        >
          <Icon size={22} />
          {#if t.id === 'fokus' && timerBadge}
            <span class="tabular-nums">{timerBadge}</span>
          {:else}
            {t.label}
          {/if}
        </a>
      </li>
    {/each}
  </ul>
</nav>
