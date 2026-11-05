<script lang="ts">
  import { BellRing, Download, GripVertical, Smartphone, Upload } from '@lucide/svelte'
  import { sortable } from '../lib/actions/sortable'
  import { routineColor } from '../lib/routines/colors'
  import BreakIdeas from '../components/settings/BreakIdeas.svelte'
  import NativeSettings from '../components/settings/NativeSettings.svelte'
  import { isNative } from '../lib/native/notifications'
  import type { Weekday } from '../lib/date'
  import { MODE_LABEL, type FocusMode, type FocusProfile } from '../lib/focus/timer'
  import { describeSchedule } from '../lib/routines/format'
  import {
    canNotify,
    canVibrate,
    chime,
    notify,
    permission,
    requestPermission,
    unlockAudio,
    vibrate as vibrateNow,
  } from '../lib/signals'
  import { app } from '../lib/state/app.svelte'
  import { focus } from '../lib/state/focus.svelte'
  import type { Theme } from '../lib/storage/adapter'
  import Segmented from '../components/ui/Segmented.svelte'
  import Switch from '../components/ui/Switch.svelte'

  let fileInput: HTMLInputElement

  // Zwei-Wege-Bindung an die Einstellungen, jede Änderung wird sofort gespeichert.
  const setting = <K extends keyof typeof app.settings>(key: K) => ({
    get: () => app.settings[key],
    set: (value: (typeof app.settings)[K]) => app.updateSettings({ [key]: value }),
  })
  const theme = setting('theme')
  const weekStart = setting('weekStart')
  const collapseDone = setting('collapseDone')
  const autoStartFocus = setting('autoStartFocus')
  const vibrate = setting('vibrate')
  const sound = setting('sound')

  const MODES: FocusMode[] = ['deep', 'normal']
  const PROFILE_FIELDS: { key: keyof FocusProfile; label: string; max: number }[] = [
    { key: 'focus', label: 'Fokus', max: 180 },
    { key: 'short', label: 'Pause', max: 60 },
    { key: 'long', label: 'Lange', max: 90 },
    { key: 'every', label: 'Lang nach', max: 12 },
  ]

  function setProfile(mode: FocusMode, key: keyof FocusProfile, value: number, max: number) {
    if (!Number.isFinite(value)) return
    const v = Math.min(max, Math.max(1, Math.round(value)))
    const profiles = structuredClone($state.snapshot(app.settings.profiles))
    profiles[mode][key] = v
    app.updateSettings({ profiles })
  }

  let perm = $state(permission())

  async function setNotify(on: boolean) {
    if (!on) return app.updateSettings({ notify: false })
    perm = await requestPermission()
    app.updateSettings({ notify: perm === 'granted' })
  }

  function testSignals() {
    unlockAudio()
    if (app.settings.sound) chime()
    if (app.settings.vibrate) vibrateNow([250, 120, 250, 120, 500])
    if (app.settings.notify) {
      void notify('Takt', {
        body: 'So sieht das Signal am Blockende aus.',
        tag: 'takt-test',
        requireInteraction: true,
      })
    }
  }

  async function exportData() {
    const json = JSON.stringify(app.snapshot(), null, 2)
    // Die Android-WebView kann keine Blob-Downloads; dort über die Zwischenablage.
    if (isNative) {
      await navigator.clipboard.writeText(json)
      alert('Daten in die Zwischenablage kopiert.')
      return
    }
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `takt-${app.today}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function importData(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const ok = app.importData(JSON.parse(await file.text()))
      alert(ok ? 'Daten importiert.' : 'Die Datei hat kein gültiges Takt-Format.')
    } catch {
      alert('Die Datei konnte nicht gelesen werden.')
    }
    fileInput.value = ''
  }

  function reset() {
    if (confirm('Alle Routinen, Aufgaben, Fokus-Takte, den Verlauf und die Einstellungen löschen?'))
      app.resetAll()
  }
</script>

<section class="flex flex-col gap-5">
  <h1 class="text-title">Einstellungen</h1>

  <div class="flex flex-col gap-5 card">
    <h2 class="text-heading">Darstellung</h2>
    <Segmented
      bind:value={theme.get, theme.set}
      label="Design"
      options={[
        { value: 'system' as Theme, label: 'System' },
        { value: 'light' as Theme, label: 'Hell' },
        { value: 'dark' as Theme, label: 'Dunkel' },
      ]}
    />
    <Switch
      bind:checked={collapseDone.get, collapseDone.set}
      label="Erledigte Routinen einklappen"
    />
  </div>

  <div class="flex flex-col gap-5 card">
    <h2 class="text-heading">Fokus</h2>
    {#each MODES as mode (mode)}
      {@const p = app.settings.profiles[mode]}
      <div class="flex flex-col gap-2">
        <span class="text-label text-text-muted">{MODE_LABEL[mode]}</span>
        <div class="grid grid-cols-4 gap-2">
          {#each PROFILE_FIELDS as f (f.key)}
            <label class="flex flex-col gap-1">
              <span class="text-small text-text-muted">{f.label}</span>
              <input
                class="field px-2 tabular-nums"
                type="number"
                inputmode="numeric"
                min="1"
                max={f.max}
                value={p[f.key]}
                onchange={(e) => setProfile(mode, f.key, e.currentTarget.valueAsNumber, f.max)}
              />
            </label>
          {/each}
        </div>
      </div>
    {/each}
    <p class="text-small text-text-muted">
      Minuten; „Lang nach“ = Anzahl Takte bis zur langen Pause.
    </p>
    <Switch
      bind:checked={autoStartFocus.get, autoStartFocus.set}
      label="Nächsten Takt automatisch starten"
      hint="Sonst wartet der Timer nach jeder Pause auf dich."
    />
    <BreakIdeas />
  </div>

  {#if isNative}
    <NativeSettings />
  {:else}
    <div class="flex flex-col gap-3 card">
      <h2 class="flex items-center gap-2 text-heading">
        <Smartphone size={20} class="text-primary" /> Android-App
      </h2>
      <p class="text-small text-text-muted">
        Erinnerungen zu Uhrzeiten und Timer-Signale bei gesperrtem Handy gibt es nur in der
        Android-App. Daten vorher hier exportieren und in der App importieren.
      </p>
      <a
        class="btn btn-sm self-start btn-secondary"
        href="https://github.com/lukas-puschnig/takt/releases/latest/download/takt.apk"
      >
        <Download size={16} /> APK herunterladen
      </a>
    </div>

    <div class="flex flex-col gap-5 card">
      <h2 class="text-heading">Signale</h2>
      {#if canNotify}
        <Switch
          bind:checked={() => app.settings.notify, setNotify}
          label="Benachrichtigung am Blockende"
          hint={perm === 'denied'
            ? 'Im Browser blockiert – in den Website-Einstellungen erlauben.'
            : 'Bleibt stehen, bis du sie wegwischst oder weitermachst.'}
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
      {:else}
        <p class="text-small text-text-muted">
          Dieser Browser unterstützt keine Benachrichtigungen. Auf dem iPhone geht es nur, wenn Takt
          zum Home-Bildschirm hinzugefügt wurde.
        </p>
      {/if}
      <Switch
        bind:checked={vibrate.get, vibrate.set}
        label="Vibration"
        hint={canVibrate ? undefined : 'Auf diesem Gerät nicht verfügbar (z. B. iPhone).'}
      />
      <Switch bind:checked={sound.get, sound.set} label="Ton" />
      <Switch
        bind:checked={
          () => app.settings.wakeLock,
          (v) => {
            app.updateSettings({ wakeLock: v })
            focus.refresh()
          }
        }
        label="Bildschirm wach halten"
        hint="Solange der Timer läuft. Hält den Timer auf dem Handy zuverlässig am Laufen."
      />
      <button type="button" class="btn btn-sm self-start btn-secondary" onclick={testSignals}>
        <BellRing size={16} /> Signal testen
      </button>
    </div>
  {/if}

  <div class="flex flex-col gap-5 card">
    <h2 class="text-heading">Tag und Woche</h2>
    <label class="flex items-center justify-between gap-4">
      <span>
        <span class="block">Neuer Tag beginnt um</span>
        <span class="block text-small text-text-muted">Bis dahin zählt die Nacht zum Vortag.</span>
      </span>
      <select
        class="field w-28"
        value={app.settings.dayStartHour}
        onchange={(e) => app.updateSettings({ dayStartHour: Number(e.currentTarget.value) })}
      >
        {#each [0, 1, 2, 3, 4, 5, 6] as hour (hour)}
          <option value={hour}>{hour}:00 Uhr</option>
        {/each}
      </select>
    </label>
    <div class="flex flex-col gap-2">
      <span>Woche beginnt am</span>
      <Segmented
        bind:value={weekStart.get, weekStart.set}
        label="Wochenstart"
        options={[
          { value: 1 as Weekday, label: 'Montag' },
          { value: 7 as Weekday, label: 'Sonntag' },
        ]}
      />
    </div>
  </div>

  <div class="flex flex-col gap-3 card">
    <h2 class="text-heading">Reihenfolge</h2>
    {#if app.routines.length}
      <ul
        class="flex flex-col"
        use:sortable={{ onmove: (from, to) => app.reorderRoutines(from, to) }}
      >
        {#each app.routines as routine (routine.id)}
          <li
            data-sort
            class="flex min-h-12 items-center gap-2 rounded-md border-b border-border py-1 last:border-0"
          >
            <span
              data-handle
              class="grid h-11 w-8 shrink-0 place-items-center text-text-muted"
              role="img"
              aria-label="Zum Verschieben ziehen"
            >
              <GripVertical size={18} />
            </span>
            <span
              class="size-2.5 shrink-0 rounded-full"
              style:background={routineColor(routine.color)}
            ></span>
            <span class="flex-1">
              <span class="block">{routine.title}</span>
              <span class="block text-small text-text-muted">
                {routine.archived
                  ? 'Pausiert'
                  : describeSchedule(routine.schedule, app.settings.weekStart)}
              </span>
            </span>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-text-muted">Noch keine Routinen.</p>
    {/if}
  </div>

  <div class="flex flex-col gap-3 card">
    <h2 class="text-heading">Daten</h2>
    <p class="text-small text-text-muted">
      Alles bleibt lokal in diesem Browser. Export als JSON, z. B. zum Sichern oder Auswerten mit
      Claude.
    </p>
    <div class="flex flex-wrap gap-2">
      <button type="button" class="btn btn-sm btn-secondary" onclick={exportData}>
        <Download size={16} /> Exportieren
      </button>
      <button type="button" class="btn btn-sm btn-secondary" onclick={() => fileInput.click()}>
        <Upload size={16} /> Importieren
      </button>
      <input
        bind:this={fileInput}
        type="file"
        accept="application/json"
        class="hidden"
        onchange={importData}
      />
    </div>
    <button
      type="button"
      class="mt-2 self-start text-small text-text-muted underline"
      onclick={reset}
    >
      Alles löschen
    </button>
  </div>

  <p class="text-center text-small text-text-muted">
    Takt {__APP_VERSION__} ·
    <a
      class="underline"
      href="https://github.com/lukas-puschnig/takt/blob/main/docs/LIZENZEN.md"
      target="_blank"
      rel="noopener">Lizenzen</a
    >
  </p>
</section>
