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
  /** running: läuft bis endsAt · paused: angehalten · ready: wartet auf Start des Takts ·
   * overtime: Takt ist seit endsAt um und zählt weiter, bis man selbst die Pause startet */
  status: 'running' | 'paused' | 'ready' | 'overtime'
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
  /** Was in der Pause nach diesem Takt passieren soll. */
  breakTask?: string
  /** Eigene Taktlänge (ms) statt der Voreinstellung. */
  focusMs?: number
  /** Tagesplan: feste Takte; danach ist der Lauf beendet. */
  blocks?: Block[]
}

/** Ein geplanter Takt mit der Pause danach (ms; pause 0 = letzter Takt). */
export interface Block {
  focus: number
  pause: number
  long: boolean
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
  /** Takt ist abgelaufen und geht in Überzeit; protokolliert wird erst, wenn man weitermacht. */
  overtime?: boolean
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
  return (
    Math.max(
      1,
      phase === 'focus' ? profile.focus : phase === 'break' ? profile.short : profile.long,
    ) * MIN
  )
}

/** Länge der Phase, die als Nächstes in `base` beginnt (round ist schon hochgezählt). */
function durationFor(base: TimerRun, profile: FocusProfile, phase: Phase): number {
  if (base.blocks) {
    return phase === 'focus'
      ? (base.blocks[base.round]?.focus ?? 0)
      : (base.blocks[base.round - 1]?.pause ?? 0)
  }
  if (phase === 'focus' && base.focusMs) return base.focusMs
  return phaseMs(profile, phase)
}

/** Plan vollständig abgearbeitet. */
export const isFinished = (run: TimerRun) => !!run.blocks && run.round >= run.blocks.length

function finish(base: TimerRun, at: number): TimerRun {
  return {
    ...base,
    phase: 'focus',
    status: 'ready',
    duration: 0,
    remaining: 0,
    startedAt: at,
    endsAt: at,
  }
}

function begin(
  base: TimerRun,
  phase: Phase,
  profile: FocusProfile,
  at: number,
  run: boolean,
): TimerRun {
  const duration = durationFor(base, profile, phase)
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

export interface StartOptions {
  goal?: string
  todoId?: string
  breakTask?: string
  focusMs?: number
  blocks?: Block[]
}

export function start(
  mode: FocusMode,
  profile: FocusProfile,
  now: number,
  opts: StartOptions = {},
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
    ...opts,
  }
  return begin(base, 'focus', profile, now, true)
}

/** Den wartenden Takt (status ready) starten. */
export function startReady(run: TimerRun, now: number): TimerRun {
  if (isFinished(run)) return run
  return { ...run, status: 'running', startedAt: now, endsAt: now + run.remaining }
}

/** Länge des wartenden bzw. nächsten Takts ändern (ms). */
export function setFocusLength(run: TimerRun, ms: number): TimerRun {
  if (run.status !== 'ready' || run.blocks) return run
  return { ...run, focusMs: ms, duration: ms, remaining: ms }
}

export function remainingMs(run: TimerRun, now: number): number {
  return run.status === 'running' ? Math.max(0, run.endsAt - now) : run.remaining
}

/** Wie lange der Takt schon über seine Zeit läuft. */
export function overtimeMs(run: TimerRun, now: number): number {
  return run.status === 'overtime' ? Math.max(0, now - run.endsAt) : 0
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
  const over = run.status === 'overtime'
  const elapsed = over
    ? run.duration + overtimeMs(run, at)
    : complete
      ? run.duration
      : run.duration - remainingMs(run, at)
  return {
    phase: run.phase,
    mode: run.mode,
    startedAt: run.startedAt,
    elapsed,
    complete: complete || over,
    at,
    goal: run.goal,
    todoId: run.todoId,
  }
}

/**
 * Nächste Phase nach der aktuellen (beim Weitermachen bzw. Überspringen).
 * Nach Fokus beginnt die Pause sofort; nach einer Pause wartet der nächste Takt
 * (oder startet sofort, wenn `autoFocus` oder ein Tagesplan läuft).
 */
export function next(
  run: TimerRun,
  profile: FocusProfile,
  at: number,
  autoFocus: boolean,
): TimerRun {
  if (run.phase === 'focus') {
    const round = run.round + 1
    if (run.blocks) {
      const block = run.blocks[round - 1]
      if (!block || !block.pause || round >= run.blocks.length) return finish({ ...run, round }, at)
      return begin({ ...run, round }, block.long ? 'long' : 'break', profile, at, true)
    }
    const phase: Phase = round % Math.max(1, profile.every) === 0 ? 'long' : 'break'
    return begin({ ...run, round }, phase, profile, at, true)
  }
  if (isFinished(run)) return finish(run, at)
  return begin(run, 'focus', profile, at, autoFocus || !!run.blocks)
}

/**
 * Was passiert, wenn die laufende Phase von selbst abläuft: Ein Takt geht in Überzeit
 * (man macht vielleicht noch etwas fertig), eine Pause endet wie gewohnt.
 */
function expire(run: TimerRun, profile: FocusProfile, autoFocus: boolean): TimerRun {
  if (run.phase === 'focus') return { ...run, status: 'overtime', remaining: 0 }
  return next(run, profile, run.endsAt, autoFocus)
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
    const e = ended(run, run.endsAt, true)
    events.push(run.phase === 'focus' ? { ...e, overtime: true } : e)
    run = expire(run, profile, autoFocus)
  }
  return { run, events }
}

/**
 * Die nächsten Phasenenden im Voraus, damit das Betriebssystem sie auch bei geschlossener
 * App pünktlich melden kann. Endet, sobald der Timer auf einen Start wartet.
 */
export function upcoming(
  run: TimerRun,
  profile: FocusProfile,
  autoFocus: boolean,
  limit = 4,
): { at: number; ended: Phase; next: TimerRun }[] {
  const out: { at: number; ended: Phase; next: TimerRun }[] = []
  let r = run
  while (out.length < limit && r.status === 'running') {
    const n = expire(r, profile, autoFocus)
    out.push({ at: r.endsAt, ended: r.phase, next: n })
    r = n
  }
  return out
}

/** Aktuelle Phase (vorzeitig oder aus der Überzeit) beenden und zur nächsten springen. */
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

/** Uhrzeit "HH:MM" eines Zeitpunkts. */
export const clockTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

export function formatMinutes(min: number): string {
  const m = Math.round(min)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h} h ${rest} min` : `${h} h`
}
