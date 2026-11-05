import type { Block, FocusMode, FocusProfile } from './timer'

const MIN = 60_000

export interface Slot {
  kind: 'focus' | 'break' | 'long'
  start: number
  end: number
}

export interface DayPlan {
  blocks: Block[]
  slots: Slot[]
  /** Fokuszeit gesamt (ms). */
  focusMs: number
  /** Gemischtes Profil, aus dem der Plan entstand (Minuten). */
  profile: FocusProfile
  /** Für das Log: ab 50 % Deep Work zählt der Plan als Deep Work. */
  mode: FocusMode
}

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

/** Vorschlag fürs Zeitfenster: ab jetzt (auf 5 min aufgerundet) drei Stunden (auf ½ h). */
export function defaultWindow(now: number): { from: string; to: string } {
  const start = new Date(Math.ceil(now / 300_000) * 300_000)
  const end = new Date(Math.round((start.getTime() + 3 * 3_600_000) / 1_800_000) * 1_800_000)
  return { from: hhmm(start), to: end.getDate() === start.getDate() ? hhmm(end) : '23:30' }
}

/** Uhrzeit "HH:MM" am Kalendertag von `now`; mit `after` notfalls am Folgetag. */
export function timeOnDay(time: string, now: number, after?: number): number {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(now)
  d.setHours(h, m, 0, 0)
  let t = d.getTime()
  if (after !== undefined && t <= after) t += 86_400_000
  return t
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const roundTo = (n: number, step: number) => Math.max(step, Math.round(n / step) * step)

/** Mischt die beiden Voreinstellungen: 0 = nur Normal (Light), 1 = nur Deep Work. */
export function blendProfile(
  normal: FocusProfile,
  deep: FocusProfile,
  ratio: number,
): FocusProfile {
  const t = Math.min(1, Math.max(0, ratio))
  return {
    focus: roundTo(lerp(normal.focus, deep.focus, t), 5),
    short: roundTo(lerp(normal.short, deep.short, t), 1),
    long: roundTo(lerp(normal.long, deep.long, t), 5),
    every: Math.max(1, Math.round(lerp(normal.every, deep.every, t))),
  }
}

/**
 * Teilt das Zeitfenster [start, end) in gleich lange Takte mit Pausen auf.
 * Die Anzahl der Takte richtet sich nach der gemischten Taktlänge; die Takte werden dann
 * gleichmäßig gestreckt oder gestaucht, sodass das Fenster genau aufgeht.
 */
export function planDay(
  start: number,
  end: number,
  ratio: number,
  profiles: Record<FocusMode, FocusProfile>,
  minFocusMin = 10,
): DayPlan {
  const profile = blendProfile(profiles.normal, profiles.deep, ratio)
  const mode: FocusMode = ratio >= 0.5 ? 'deep' : 'normal'
  const empty: DayPlan = { blocks: [], slots: [], focusMs: 0, profile, mode }
  const window = end - start
  if (window < minFocusMin * MIN) return empty

  const pauses = (n: number) =>
    Array.from({ length: n - 1 }, (_, i) => {
      const long = (i + 1) % profile.every === 0
      return { ms: (long ? profile.long : profile.short) * MIN, long }
    })

  // Takte so wählen, dass die Taktlänge möglichst nah an der Vorgabe liegt.
  let n = Math.max(
    1,
    Math.round((window + profile.short * MIN) / ((profile.focus + profile.short) * MIN)),
  )
  for (; n > 1; n--) {
    const pauseTotal = pauses(n).reduce((s, p) => s + p.ms, 0)
    if ((window - pauseTotal) / n >= minFocusMin * MIN) break
  }

  const gaps = pauses(n)
  const focusTotal = window - gaps.reduce((s, p) => s + p.ms, 0)
  // Auf ganze Minuten; der letzte Takt nimmt den Rest.
  const each = Math.floor(focusTotal / n / MIN) * MIN
  const blocks: Block[] = []
  const slots: Slot[] = []
  let t = start
  for (let i = 0; i < n; i++) {
    const focus = i === n - 1 ? end - t : each
    slots.push({ kind: 'focus', start: t, end: t + focus })
    t += focus
    const gap = gaps[i]
    if (gap) {
      slots.push({ kind: gap.long ? 'long' : 'break', start: t, end: t + gap.ms })
      t += gap.ms
    }
    blocks.push({ focus, pause: gap?.ms ?? 0, long: !!gap?.long })
  }
  return { blocks, slots, focusMs: focusTotal, profile, mode }
}
