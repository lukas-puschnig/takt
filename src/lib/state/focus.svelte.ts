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
  isFinished,
  overtimeMs,
  setFocusLength,
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
import type { DayPlan } from '../focus/plan'
import { isNative, syncTimer } from '../native/notifications'
import { app } from './app.svelte'

const KEY = 'takt:timer'
const PATTERN = [250, 120, 250, 120, 500]
/** Signale nur, wenn das Ende frisch ist – nicht beim Öffnen der App Stunden später. */
const FRESH_MS = 3 * 60_000

export interface TaskOptions {
  goal?: string
  todoId?: string
  breakTask?: string
}

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
  /** Eigene Länge des nächsten Takts in Minuten (null = Voreinstellung des Modus). */
  customMinutes = $state<number | null>(null)

  profile = $derived(app.settings.profiles[this.run?.mode ?? this.mode])
  #idleMs = $derived(
    this.customMinutes ? this.customMinutes * 60_000 : phaseMs(this.profile, 'focus'),
  )
  remaining = $derived(this.run ? remainingMs(this.run, this.now) : this.#idleMs)
  /** Wie lange der abgelaufene Takt schon in Überzeit ist. */
  overtime = $derived(this.run ? overtimeMs(this.run, this.now) : 0)
  duration = $derived(this.run?.duration ?? this.#idleMs)

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
    // Ein Takt in Überzeit wird erst protokolliert, wenn man weitermacht (inkl. Überzeit).
    if (e.phase !== 'focus' || e.overtime) return
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
    if (isFinished(run)) return 'Tagesplan geschafft.'
    if (run.status === 'ready') return 'Der nächste Takt wartet auf dich.'
    if (run.status === 'paused') return `${PHASE_LABEL[run.phase]} pausiert.`
    if (run.status === 'overtime') {
      const goal = run.goal ? `${run.goal} · ` : ''
      return `${goal}Überzeit seit ${clockTime(run.endsAt)}. Pause startest du in der App.`
    }
    const what =
      run.phase === 'focus'
        ? run.goal
          ? `Fokus: ${run.goal}`
          : 'Fokus'
        : run.breakTask
          ? `${PHASE_LABEL[run.phase]}: ${run.breakTask}`
          : PHASE_LABEL[run.phase]
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
      void notify(focusEnded ? 'Takt ist um.' : 'Pause vorbei.', {
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
    const running = this.run?.status === 'running' || this.run?.status === 'overtime'
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
            title: u.ended === 'focus' ? 'Takt ist um.' : 'Pause vorbei.',
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
    this.customMinutes = null
    this.#save()
  }

  /** Länge des nächsten Takts einstellen (vor dem Start oder solange er wartet). */
  setMinutes(minutes: number) {
    if (!this.run) {
      this.customMinutes = minutes
    } else if (this.run.status === 'ready') {
      this.run = setFocusLength(this.run, minutes * 60_000)
      this.#save()
    }
  }

  start(opts: TaskOptions = {}) {
    unlockAudio()
    this.toRate = null
    const focusMs = this.customMinutes ? this.customMinutes * 60_000 : undefined
    this.run = start(this.mode, app.settings.profiles[this.mode], Date.now(), {
      ...opts,
      focusMs,
    })
    void this.#sync()
  }

  /** Tagesplan sofort starten; nach jeder Pause startet der nächste Takt ohne Nachfrage. */
  startPlan(plan: DayPlan, opts: TaskOptions = {}) {
    if (!plan.blocks.length) return
    unlockAudio()
    this.toRate = null
    this.run = start(plan.mode, app.settings.profiles[plan.mode], Date.now(), {
      ...opts,
      blocks: plan.blocks,
    })
    void this.#sync()
  }

  /** Den wartenden nächsten Takt starten, mit neuem Ziel und neuer Pausenaufgabe. */
  startNext(opts: TaskOptions = {}) {
    if (!this.run) return this.start(opts)
    unlockAudio()
    this.toRate = null
    this.run = startReady(
      { ...this.run, goal: opts.goal, todoId: opts.todoId, breakTask: opts.breakTask },
      Date.now(),
    )
    void this.#sync()
  }

  /** Was in der kommenden (oder laufenden) Pause passieren soll. */
  setBreakTask(text: string | undefined) {
    if (!this.run) return
    this.run = { ...this.run, breakTask: text || undefined }
    void this.#sync(false)
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
