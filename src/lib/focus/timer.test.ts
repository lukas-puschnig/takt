import { describe, expect, it } from 'vitest'
import {
  catchUp,
  DEFAULT_PROFILES,
  formatClock,
  formatMinutes,
  overtimeMs,
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

  it('geht nach dem Takt in Überzeit statt automatisch in die Pause', () => {
    const run = start('normal', P, T0, { goal: 'Kapitel 2' })
    const after = catchUp(run, P, T0 + 31 * MIN, false)
    expect(after.events).toHaveLength(1)
    expect(after.events[0]).toMatchObject({ phase: 'focus', overtime: true, at: T0 + 25 * MIN })
    expect(after.run).toMatchObject({ phase: 'focus', status: 'overtime', round: 0 })
    expect(remainingMs(after.run, T0 + 31 * MIN)).toBe(0)
    expect(overtimeMs(after.run, T0 + 31 * MIN)).toBe(6 * MIN)
    // Später kommt nichts mehr nach
    expect(catchUp(after.run, P, T0 + 90 * MIN, false).events).toEqual([])
  })

  it('protokolliert die Überzeit mit, sobald man die Pause startet', () => {
    const over = catchUp(start('normal', P, T0, { goal: 'X' }), P, T0 + 26 * MIN, false).run
    const { run, event } = skip(over, P, T0 + 32 * MIN)
    expect(event).toMatchObject({ complete: true, elapsed: 32 * MIN, goal: 'X' })
    expect(event?.overtime).toBeUndefined()
    expect(run).toMatchObject({ phase: 'break', status: 'running', round: 1 })
    expect(run.endsAt).toBe(T0 + 37 * MIN)
    expect(stop(over, T0 + 40 * MIN)).toMatchObject({ complete: true, elapsed: 40 * MIN })
  })

  it('wartet nach der Pause auf den nächsten Takt', () => {
    const over = catchUp(start('normal', P, T0), P, T0 + 25 * MIN, false).run
    const brk = skip(over, P, T0 + 25 * MIN).run
    const after = catchUp(brk, P, T0 + 31 * MIN, false)
    expect(after.events.map((e) => e.phase)).toEqual(['break'])
    expect(after.run).toMatchObject({ phase: 'focus', status: 'ready', round: 1 })
  })

  it('startet mit autoFocus nach der Pause direkt den nächsten Takt', () => {
    const over = catchUp(start('normal', P, T0), P, T0 + 25 * MIN, true).run
    const brk = skip(over, P, T0 + 25 * MIN).run
    const after = catchUp(brk, P, T0 + 31 * MIN, true)
    expect(after.run).toMatchObject({ phase: 'focus', status: 'running', startedAt: T0 + 30 * MIN })
  })

  it('macht nach jedem vierten Takt eine lange Pause', () => {
    let run = start('normal', P, T0)
    run = { ...run, round: 3 }
    const over = catchUp(run, P, T0 + 26 * MIN, false).run
    expect(skip(over, P, T0 + 26 * MIN).run).toMatchObject({
      phase: 'long',
      round: 4,
      duration: 15 * MIN,
    })
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
    const brk = skip(catchUp(run, P, T0 + 40 * MIN, false).run, P, T0 + 40 * MIN).run
    const after = catchUp(brk, P, T0 + 46 * MIN, false)
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
    const first = catchUp(run, P, T0 + 30 * MIN, false).run
    expect(first.status).toBe('overtime')
    const brk = skip(first, P, T0 + 30 * MIN).run
    const mid = catchUp(brk, P, T0 + 36 * MIN, false)
    // Pause vorbei: der nächste Takt startet ohne Nachfrage
    expect(mid.run).toMatchObject({ phase: 'focus', status: 'running', duration: 20 * MIN })
    const last = catchUp(mid.run, P, T0 + 60 * MIN, false)
    expect(last.run.status).toBe('overtime')
    const end = skip(last.run, P, T0 + 60 * MIN).run
    expect(isFinished(end)).toBe(true)
    expect(end.status).toBe('ready')
  })

  it('plant Phasenenden nur bis zum Ende des Takts im Voraus', () => {
    const run = start('normal', P, T0)
    const ends = upcoming(run, P, true)
    expect(ends.map((u) => [u.ended, u.at])).toEqual([['focus', T0 + 25 * MIN]])
    expect(ends[0].next.status).toBe('overtime')
    const brk = skip(run, P, T0 + 10 * MIN).run
    expect(upcoming(brk, P, true).map((u) => u.ended)).toEqual(['break', 'focus'])
    expect(upcoming(pause(run, T0 + MIN), P, false)).toEqual([])
  })

  it('formatiert Zeiten', () => {
    expect(formatClock(25 * MIN)).toBe('25:00')
    expect(formatClock(61_500)).toBe('01:02')
    expect(formatMinutes(125)).toBe('2 h 5 min')
    expect(formatMinutes(45)).toBe('45 min')
  })
})
