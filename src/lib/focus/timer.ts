/** Fokus-Timer als reine Zustandsmaschine. Zeiten in ms; die Laufzeit hängt nur an `endsAt`,
 * damit der Timer auch nach eingefrorenen Hintergrund-Tabs exakt aufholt. */

export type FocusMode = 'deep' | 'normal'
export type Phase = 'focus' | 'break' | 'long'

export interface FocusProfile {
  /** Minuten */
  focus: number
  short: number
  long: number
  /** Nach so vielen Takten eine lange Pause. */
  every: number
}

export const DEFAULT_PROFILES: Record<FocusMode, FocusProfile> = {
  deep: { focus: 50, short: 10, long: 20, every: 3 },
  normal: { focus: 25, short: 5, long: 15, every: 4 },
}

export const MODE_LABEL: Record<FocusMode, string> = { deep: 'Deep Work', normal: 'Normal' }
export const PHASE_LABEL: Record<Phase, string> = {
  focus: 'Fokus',
  break: 'Pause',
  long: 'Lange Pause',
}

export interface TimerRun {
  mode: FocusMode
  phase: Phase
  /** running: läuft bis endsAt · paused: angehalten · ready: wartet auf Start des Takts */
  status: 'running' | 'paused' | 'ready'
  endsAt: number
  /** Restzeit, solange nicht `running`. */
  remaining: number
  duration: number
  /** Beginn der aktuellen Phase (für das Log). */
  startedAt: number
  /** Abgeschlossene Fokus-Takte dieser Serie. */
  round: number
  goal?: string
  todoId?: string
}

export interface PhaseEnd {
  phase: Phase
  mode: FocusMode
  startedAt: number
  /** Tatsächlich gelaufene Zeit in ms. */
  elapsed: number
  /** Regulär zu Ende gelaufen (nicht abgebrochen). */
  complete: boolean
  at: number
  goal?: string
  todoId?: string
}

/** Ein protokollierter Fokus-Takt. */
export interface FocusSession {
  id: string
  /** Logischer Tag (Tagesgrenze beachtet). */
  day: string
  /** Startzeit als ISO-String. */
  start: string
  minutes: number
  mode: FocusMode
  complete: boolean
  goal?: string
  todoId?: string
  /** Wie fokussiert, 1–5. */
  rating?: number
}

const MIN = 60_000

export function phaseMs(profile: FocusProfile, phase: Phase): number {
  return Math.max(1, phase === 'focus' ? profile.focus : phase === 'break' ? profile.short : profile.long) * MIN
}

function begin(base: TimerRun, phase: Phase, profile: FocusProfile, at: number, run: boolean): TimerRun {
  const duration = phaseMs(profile, phase)
  return {
    ...base,
    phase,
    status: run ? 'running' : 'ready',
    duration,
    remaining: duration,
    startedAt: at,
    endsAt: at + duration,
  }
}

export function start(
  mode: FocusMode,
  profile: FocusProfile,
  now: number,
  goal?: string,
  todoId?: string,
): TimerRun {
  const base: TimerRun = {
    mode,
    phase: 'focus',
    status: 'running',
    endsAt: 0,
    remaining: 0,
    duration: 0,
    startedAt: now,
    round: 0,
    goal,
    todoId,
  }
  return begin(base, 'focus', profile, now, true)
}

/** Den wartenden Takt (status ready) starten. */
export function startReady(run: TimerRun, now: number): TimerRun {
  return { ...run, status: 'running', startedAt: now, endsAt: now + run.remaining }
}

export function remainingMs(run: TimerRun, now: number): number {
  return run.status === 'running' ? Math.max(0, run.endsAt - now) : run.remaining
}

export function pause(run: TimerRun, now: number): TimerRun {
  if (run.status !== 'running') return run
  return { ...run, status: 'paused', remaining: remainingMs(run, now) }
}

export function resume(run: TimerRun, now: number): TimerRun {
  if (run.status !== 'paused') return run
  return { ...run, status: 'running', endsAt: now + run.remaining }
}

function ended(run: TimerRun, at: number, complete: boolean): PhaseEnd {
  const elapsed = complete ? run.duration : run.duration - remainingMs(run, at)
  return {
    phase: run.phase,
    mode: run.mode,
    startedAt: run.startedAt,
    elapsed,
    complete,
    at,
    goal: run.goal,
    todoId: run.todoId,
  }
}

/**
 * Nächste Phase nach dem Ende der aktuellen.
 * Nach Fokus beginnt die Pause sofort; nach einer Pause wartet der nächste Takt
 * (oder startet sofort, wenn `autoFocus`).
 */
export function next(
  run: TimerRun,
  profile: FocusProfile,
  at: number,
  autoFocus: boolean,
): TimerRun {
  if (run.phase === 'focus') {
    const round = run.round + 1
    const phase: Phase = round % Math.max(1, profile.every) === 0 ? 'long' : 'break'
    return begin({ ...run, round }, phase, profile, at, true)
  }
  return begin(run, 'focus', profile, at, autoFocus)
}

/** Holt alle Phasen nach, die bis `now` abgelaufen sind. */
export function catchUp(
  run: TimerRun,
  profile: FocusProfile,
  now: number,
  autoFocus: boolean,
): { run: TimerRun; events: PhaseEnd[] } {
  const events: PhaseEnd[] = []
  // Obergrenze schützt vor Endlosschleifen bei kaputten Daten.
  for (let i = 0; i < 100 && run.status === 'running' && run.endsAt <= now; i++) {
    events.push(ended(run, run.endsAt, true))
    run = next(run, profile, run.endsAt, autoFocus)
  }
  return { run, events }
}

/** Aktuelle Phase vorzeitig beenden und zur nächsten springen. */
export function skip(
  run: TimerRun,
  profile: FocusProfile,
  now: number,
): { run: TimerRun; event: PhaseEnd | null } {
  if (run.status === 'ready') return { run, event: null }
  // Übersprungene Pausen führen zum wartenden Takt, übersprungene Takte in die Pause.
  return { run: next(run, profile, now, false), event: ended(run, now, false) }
}

/** Timer beenden; liefert die angebrochene Phase für das Log. */
export function stop(run: TimerRun, now: number): PhaseEnd | null {
  return run.status === 'ready' ? null : ended(run, now, false)
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatMinutes(min: number): string {
  const m = Math.round(min)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h} h ${rest} min` : `${h} h`
}
