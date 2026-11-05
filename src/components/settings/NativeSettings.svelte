<script lang="ts">
  import { AlarmClock, BellRing } from '@lucide/svelte'
  import { onMount } from 'svelte'
  import {
    checkPermissions,
    openExactAlarmSettings,
    requestPermissions,
    testNotification,
    type PermissionState,
  } from '../../lib/native/notifications'
  import { app } from '../../lib/state/app.svelte'
  import { focus } from '../../lib/state/focus.svelte'
  import Switch from '../ui/Switch.svelte'

  let perm = $state<PermissionState>({ notifications: true, exact: true })

  const refresh = async () => (perm = await checkPermissions())
  onMount(() => {
    void refresh()
    // Zurück aus den Systemeinstellungen: Status neu lesen.
    const onVisible = () => document.visibilityState === 'visible' && void refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  })

  async function allow() {
    perm = await requestPermissions()
  }

  async function setNotify(on: boolean) {
    if (on && !perm.notifications) await allow()
    app.updateSettings({ notify: on && perm.notifications })
    focus.refresh()
  }

  const daily = $derived(app.settings.dailyReminder)

  const test = () => void testNotification(5000)
</script>

{#if !perm.notifications || !perm.exact}
  <div class="flex flex-col gap-3 card">
    <h2 class="flex items-center gap-2 text-heading">
      <AlarmClock size={20} class="text-primary" /> Berechtigungen
    </h2>
    {#if !perm.notifications}
      <p class="text-small text-text-muted">
        Ohne Benachrichtigungen kommen weder Erinnerungen noch das Signal am Blockende.
      </p>
      <button type="button" class="btn btn-sm self-start btn-primary" onclick={allow}>
        Benachrichtigungen erlauben
      </button>
    {/if}
    {#if !perm.exact}
      <p class="text-small text-text-muted">
        Für minutengenaue Erinnerungen „Wecker &amp; Erinnerungen“ für Takt erlauben.
      </p>
      <button
        type="button"
        class="btn btn-sm self-start btn-secondary"
        onclick={() => openExactAlarmSettings()}
      >
        Einstellung öffnen
      </button>
    {/if}
  </div>
{/if}

<div class="flex flex-col gap-5 card">
  <h2 class="text-heading">Erinnerungen</h2>
  <div class="flex flex-col gap-2">
    <Switch
      bind:checked={
        () => !!daily, (on) => app.updateSettings({ dailyReminder: on ? daily || '18:00' : '' })
      }
      label="Täglich an Offenes erinnern"
      hint="Nur wenn noch Aufgaben (oder Routinen) offen sind."
    />
    {#if daily}
      <div class="flex items-center justify-between gap-4">
        <span class="text-small text-text-muted">Uhrzeit</span>
        <input
          class="field w-32"
          type="time"
          value={daily}
          onchange={(e) =>
            e.currentTarget.value && app.updateSettings({ dailyReminder: e.currentTarget.value })}
        />
      </div>
      <Switch
        bind:checked={
          () => app.settings.summaryRoutines, (v) => app.updateSettings({ summaryRoutines: v })
        }
        label="Routinen mitzählen"
      />
    {/if}
  </div>
  <Switch
    bind:checked={
      () => app.settings.stickyReminders, (v) => app.updateSettings({ stickyReminders: v })
    }
    label="Erinnerungen bleiben stehen"
    hint="Aufgaben-Erinnerungen lassen sich nicht wegwischen, nur abhaken oder verschieben."
  />
  <p class="text-small text-text-muted">
    Uhrzeit pro Aufgabe im Aufgaben-Editor oder direkt beim Eintippen, z. B. „Zahnarzt morgen um 9“.
  </p>
</div>

<div class="flex flex-col gap-5 card">
  <h2 class="text-heading">Signale</h2>
  <Switch
    bind:checked={() => app.settings.notify, setNotify}
    label="Benachrichtigung am Blockende"
    hint="Kommt auch bei gesperrtem Handy pünktlich."
  />
  {#if app.settings.notify}
    <Switch
      bind:checked={
        () => app.settings.statusNotify,
        (v) => {
          app.updateSettings({ statusNotify: v })
          focus.refresh()
        }
      }
      label="Laufenden Takt anzeigen"
      hint="Stehende Benachrichtigung mit Endzeit, solange ein Takt läuft."
    />
  {/if}
  <p class="text-small text-text-muted">
    Ton und Vibration stellst du in den Android-Einstellungen der App unter „Benachrichtigungen“ ein
    (Kanäle „Fokus-Timer“ und „Erinnerungen“).
  </p>
  <button type="button" class="btn btn-sm self-start btn-secondary" onclick={test}>
    <BellRing size={16} /> Signal in 5 s testen
  </button>
</div>
