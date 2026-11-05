import {
  catchUp,
  clockTime,
  pause,
  PHASE_LABEL,
  phaseMs,
  remainingMs,
  resume,
  skip,
  start,
  startReady,
  stop,
  upcoming,
  type FocusMode,
  type PhaseEnd,
  type TimerRun,
} from '../focus/timer'
import {
  chime,
  clearNotifications,
  keepAwake,
  notify,
  TIMER_TAG,
  unlockAudio,
  vibrate,
} from '../signals'
import { isNative, syncTimer } from '../native/notifications'
import { app } from './app.svelte'

const KEY = 'takt:timer'
const PATTERN = [250, 120, 250, 120, 500]
/** Signale nur, wenn das Ende frisch ist – nicht beim Öffnen der App Stunden später. */
const FRESH_MS = 3 * 60_000

interface Stored {
  run: TimerRun | null
  mode: FocusMode
}

function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { run: null, mode: 'deep', ...JSON.parse(raw) }
  } catch {
    /* ignorieren */
  }
  return { run: null, mode: 'deep' }
}

class FocusTimer {
  run = $state<TimerRun | null>(null)
  /** Modus für den nächsten Start. */
  mode = $state<FocusMode>('deep')
  now = $state(Date.now())
  /** Gerade abgeschlossener Takt, der noch bewertet werden kann. */
  toRate = $state<string | null>(null)

  profile = $derived(app.settings.profiles[this.run?.mode ?? this.mode])
  remaining = $derived(this.run ? remainingMs(this.run, this.now) : phaseMs(this.profile, 'focus'))
  duration = $derived(this.run?.duration ?? phaseMs(this.profile, 'focus'))

  init() {
    const stored = load()
    this.run = stored.run
    this.mode = stored.mode
    this.#tick()
    setInterval(() => this.#tick(), 1000)
    document.addEventListener('visibilitychange', () => this.#tick())
    void this.#sync(false)
  }

  #tick() {
    this.now = Date.now()
    if (!this.run || this.run.status !== 'running') return
    const { run, events } = catchUp(
      this.run,
      app.settings.profiles[this.run.mode],
      this.now,
      app.settings.autoStartFocus,
    )
    if (!events.length) return
    this.run = run
    for (const e of events) this.#log(e)
    const last = events.at(-1)!
    if (this.now - last.at < FRESH_MS) this.#alert(last, run)
    void this.#sync(false)
  }

  #save() {
    try {
      localStorage.setItem(KEY, JSON.stringify($state.snapshot({ run: this.run, mode: this.mode })))
    } catch {
      /* Speicher voll oder gesperrt */
    }
  }

  #log(e: PhaseEnd) {
    if (e.phase !== 'focus') return
    const minutes = Math.round(e.elapsed / 60_000)
    if (minutes < 1) return
    const id = app.addSession({
      day: app.dayOf(e.startedAt),
      start: new Date(e.startedAt).toISOString(),
      minutes,
      mode: e.mode,
      complete: e.complete,
      ...(e.goal ? { goal: e.goal } : {}),
      ...(e.todoId ? { todoId: e.todoId } : {}),
    })
    if (e.complete) this.toRate = id
  }

  /** Beschreibung der aktuellen Phase für Benachrichtigungen. */
  #describe(run: TimerRun): string {
    if (run.status === 'ready') return 'Der nächste Takt wartet auf dich.'
    if (run.status === 'paused') return `${PHASE_LABEL[run.phase]} pausiert.`
    const what =
      run.phase === 'focus' ? (run.goal ? `Fokus: ${run.goal}` : 'Fokus') : PHASE_LABEL[run.phase]
    return `${what} bis ${clockTime(run.endsAt)}`
  }

  #alert(e: PhaseEnd, run: TimerRun) {
    // In der Android-App meldet das System das Ende selbst (vorab geplant, siehe #sync).
    if (isNative) return
    const s = app.settings
    const focusEnded = e.phase === 'focus'
    if (s.vibrate) vibrate(PATTERN)
    if (s.sound) chime(focusEnded)
    if (s.notify) {
      void notify(focusEnded ? 'Zeit für eine Pause.' : 'Pause vorbei.', {
        body: this.#describe(run),
        tag: TIMER_TAG,
        renotify: true,
        requireInteraction: true,
        silent: !s.vibrate && !s.sound,
        vibrate: s.vibrate ? PATTERN : undefined,
        data: { url: './#/fokus' },
      })
    }
  }

  /** Speichern, Wake Lock und stehende Benachrichtigung an den Zustand anpassen. */
  async #sync(updateStatus = true) {
    this.#save()
    const running = this.run?.status === 'running'
    void keepAwake(running && app.settings.wakeLock)
    if (isNative) return this.#syncNative(updateStatus)
    if (!this.run) return clearNotifications(TIMER_TAG)
    if (updateStatus && app.settings.statusNotify) {
      await notify('Takt', {
        body: this.#describe(this.run),
        tag: TIMER_TAG,
        silent: true,
        requireInteraction: true,
        data: { url: './#/fokus' },
      })
    } else if (updateStatus) {
      // Eine noch offene Ende-Benachrichtigung ist erledigt, sobald man weitermacht.
      await clearNotifications(TIMER_TAG)
    }
  }

  /** Android: alle kommenden Phasenenden beim System vormerken, auch bei gesperrtem Handy. */
  async #syncNative(clearDelivered: boolean) {
    const s = app.settings
    const run = this.run
    const alerts =
      run && s.notify
        ? upcoming(run, s.profiles[run.mode], s.autoStartFocus).map((u) => ({
            at: u.at,
            title: u.ended === 'focus' ? 'Zeit für eine Pause.' : 'Pause vorbei.',
            body: this.#describe(u.next),
          }))
        : []
    const status = run && s.statusNotify ? this.#describe(run) : null
    await syncTimer(alerts, status, clearDelivered).catch((e) =>
      console.error('Timer-Benachrichtigungen fehlgeschlagen', e),
    )
  }

  // --- Aktionen ------------------------------------------------------------

  setMode(mode: FocusMode) {
    this.mode = mode
    this.#save()
  }

  start(goal?: string, todoId?: string) {
    unlockAudio()
    this.toRate = null
    this.run = start(this.mode, app.settings.profiles[this.mode], Date.now(), goal, todoId)
    void this.#sync()
  }

  /** Den wartenden nächsten Takt starten, optional mit neuem Ziel. */
  startNext(goal?: string, todoId?: string) {
    if (!this.run) return this.start(goal, todoId)
    unlockAudio()
    this.toRate = null
    this.run = startReady({ ...this.run, goal, todoId }, Date.now())
    void this.#sync()
  }

  pause() {
    if (!this.run) return
    this.run = pause(this.run, Date.now())
    void this.#sync()
  }

  resume() {
    if (!this.run) return
    unlockAudio()
    this.run = resume(this.run, Date.now())
    void this.#sync()
  }

  skip() {
    if (!this.run) return
    const { run, event } = skip(this.run, app.settings.profiles[this.run.mode], Date.now())
    if (event) this.#log(event)
    this.run = run
    void this.#sync()
  }

  stop() {
    if (!this.run) return
    const event = stop(this.run, Date.now())
    if (event) this.#log(event)
    this.run = null
    void this.#sync()
  }

  /** Einstellungen haben sich geändert (z. B. Status-Benachrichtigung an/aus). */
  refresh() {
    void this.#sync()
  }
}

export const focus = new FocusTimer()
