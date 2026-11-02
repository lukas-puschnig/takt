<script lang="ts">
  import { ArrowDown, ArrowUp, Download, Upload } from '@lucide/svelte'
  import type { Weekday } from '../lib/date'
  import { describeSchedule } from '../lib/routines/format'
  import { app } from '../lib/state/app.svelte'
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

  function exportData() {
    const blob = new Blob([JSON.stringify(app.snapshot(), null, 2)], { type: 'application/json' })
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
    if (confirm('Alle Routinen, den Verlauf und die Einstellungen löschen?')) app.resetAll()
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
      <ul class="flex flex-col">
        {#each app.routines as routine, i (routine.id)}
          <li class="flex min-h-11 items-center gap-2 border-b border-border py-1 last:border-0">
            <span class="flex-1">
              <span class="block">{routine.title}</span>
              <span class="block text-small text-text-muted">
                {routine.archived
                  ? 'Pausiert'
                  : describeSchedule(routine.schedule, app.settings.weekStart)}
              </span>
            </span>
            <button
              type="button"
              class="grid size-11 place-items-center rounded-full text-text-muted disabled:opacity-30"
              aria-label="Nach oben"
              disabled={i === 0}
              onclick={() => app.moveRoutine(routine.id, -1)}
            >
              <ArrowUp size={18} />
            </button>
            <button
              type="button"
              class="grid size-11 place-items-center rounded-full text-text-muted disabled:opacity-30"
              aria-label="Nach unten"
              disabled={i === app.routines.length - 1}
              onclick={() => app.moveRoutine(routine.id, 1)}
            >
              <ArrowDown size={18} />
            </button>
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

  <p class="text-center text-small text-text-muted">Takt {__APP_VERSION__}</p>
</section>
