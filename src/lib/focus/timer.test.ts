import { describe, expect, it } from 'vitest'
import {
  catchUp,
  DEFAULT_PROFILES,
  formatClock,
  formatMinutes,
  pause,
  remainingMs,
  resume,
  skip,
  start,
  setFocusLength,
  isFinished,
  stop,
  upcoming,
} from './timer'

const P = DEFAULT_PROFILES.normal // 25 / 5 / 15, alle 4
const MIN = 60_000
const T0 = 1_000_000

describe('timer', () => {
  it('läuft über endsAt und lässt sich pausieren', () => {
    let run = start('normal', P, T0)
    expect(remainingMs(run, T0 + 5 * MIN)).toBe(20 * MIN)
    run = pause(run, T0 + 5 * MIN)
    expect(remainingMs(run, T0 + 60 * MIN)).toBe(20 * MIN)
    run = resume(run, T0 + 60 * MIN)
    expect(remainingMs(run, T0 + 70 * MIN)).toBe(10 * MIN)
  })

  it('geht nach dem Fokus in die Pause und wartet danach', () => {
    const run = start('normal', P, T0, { goal: 'Kapitel 2' })
    const after = catchUp(run, P, T0 + 31 * MIN, false)
    expect(after.events.map((e) => e.phase)).toEqual(['focus', 'break'])
    expect(after.events[0]).toMatchObject({ complete: true, elapsed: 25 * MIN, goal: 'Kapitel 2' })
    expect(after.run).toMatchObject({ phase: 'focus', status: 'ready', round: 1 })
  })

  it('startet mit autoFocus direkt den nächsten Takt', () => {
    const after = catchUp(start('normal', P, T0), P, T0 + 31 * MIN, true)
    expect(after.run).toMatchObject({ phase: 'focus', status: 'running', startedAt: T0 + 30 * MIN })
  })

  it('macht nach jedem vierten Takt eine lange Pause', () => {
    let run = start('normal', P, T0)
    run = { ...run, round: 3 }
    const after = catchUp(run, P, T0 + 26 * MIN, false)
    expect(after.run).toMatchObject({ phase: 'long', round: 4, duration: 15 * MIN })
  })

  it('protokolliert abgebrochene Takte mit der echten Dauer', () => {
    const run = start('deep', DEFAULT_PROFILES.deep, T0)
    expect(stop(run, T0 + 12 * MIN)).toMatchObject({ complete: false, elapsed: 12 * MIN })
    const skipped = skip(run, DEFAULT_PROFILES.deep, T0 + 12 * MIN)
    expect(skipped.event?.elapsed).toBe(12 * MIN)
    expect(skipped.run).toMatchObject({ phase: 'break', status: 'running' })
  })

  it('nutzt eine eigene Taktlänge auch für folgende Takte', () => {
    const run = start('normal', P, T0, { focusMs: 40 * MIN })
    expect(run.duration).toBe(40 * MIN)
    const after = catchUp(run, P, T0 + 46 * MIN, false)
    expect(after.run).toMatchObject({ status: 'ready', duration: 40 * MIN })
    expect(setFocusLength(after.run, 15 * MIN).remaining).toBe(15 * MIN)
  })

  it('arbeitet einen Tagesplan ab und endet danach', () => {
    const blocks = [
      { focus: 30 * MIN, pause: 5 * MIN, long: false },
      { focus: 20 * MIN, pause: 0, long: false },
    ]
    const run = start('deep', P, T0, { blocks })
    expect(run.duration).toBe(30 * MIN)
    const mid = catchUp(run, P, T0 + 36 * MIN, false)
    // Pause vorbei: der nächste Takt startet ohne Nachfrage
    expect(mid.run).toMatchObject({ phase: 'focus', status: 'running', duration: 20 * MIN })
    const end = catchUp(mid.run, P, T0 + 60 * MIN, false)
    expect(isFinished(end.run)).toBe(true)
    expect(end.run.status).toBe('ready')
    expect(end.events.map((e) => e.phase)).toEqual(['focus'])
  })

  it('plant die nächsten Phasenenden im Voraus', () => {
    const run = start('normal', P, T0)
    expect(upcoming(run, P, false).map((u) => [u.ended, u.at])).toEqual([
      ['focus', T0 + 25 * MIN],
      ['break', T0 + 30 * MIN],
    ])
    expect(upcoming(run, P, true, 3)).toHaveLength(3)
    expect(upcoming(pause(run, T0 + MIN), P, false)).toEqual([])
  })

  it('formatiert Zeiten', () => {
    expect(formatClock(25 * MIN)).toBe('25:00')
    expect(formatClock(61_500)).toBe('01:02')
    expect(formatMinutes(125)).toBe('2 h 5 min')
    expect(formatMinutes(45)).toBe('45 min')
  })
})
