import { describe, expect, it } from 'vitest'
import { addDays, logicalToday, weekOf } from '../date'
import { dayRatio, isDue, progress, setAll, streak, subtasksFor, toggleItem } from './schedule'
import { SELF, type DayLogs, type Routine } from './types'

// 2026-11-02 ist ein Montag.
const MON = '2026-11-02'

const morning: Routine = {
  id: 'm',
  title: 'Morgens',
  schedule: { type: 'weekly', days: [1, 2, 3, 4, 5, 6, 7] },
  subtasks: [
    { id: 'a', title: 'Dehnen' },
    { id: 'b', title: 'Rückenblock', days: [1, 3, 5] },
  ],
  createdOn: '2026-10-01',
}

const gym: Routine = {
  id: 'g',
  title: 'Gym',
  schedule: { type: 'weekly', days: [1, 3, 5] },
  subtasks: [],
  createdOn: '2026-10-01',
}

describe('date', () => {
  it('zählt die Nacht bis zur Tagesgrenze zum Vortag', () => {
    expect(logicalToday(new Date(2026, 10, 3, 2, 30), 3)).toBe(MON)
    expect(logicalToday(new Date(2026, 10, 3, 3, 0), 3)).toBe('2026-11-03')
  })

  it('liefert die Woche ab dem gewählten Wochenstart', () => {
    expect(weekOf('2026-11-05', 1)[0]).toBe(MON)
    expect(weekOf('2026-11-05', 7)[0]).toBe('2026-11-01')
  })
})

describe('isDue', () => {
  it('beachtet Wochentage', () => {
    expect(isDue(gym, MON)).toBe(true)
    expect(isDue(gym, addDays(MON, 1))).toBe(false)
  })

  it('beachtet Intervalle ab Starttag', () => {
    const r: Routine = { ...gym, schedule: { type: 'interval', every: 3, start: MON } }
    expect(isDue(r, MON)).toBe(true)
    expect(isDue(r, addDays(MON, 2))).toBe(false)
    expect(isDue(r, addDays(MON, 3))).toBe(true)
    expect(isDue(r, addDays(MON, -3))).toBe(false)
  })

  it('ist vor dem Anlegen und archiviert nie fällig', () => {
    expect(isDue(gym, '2026-09-28')).toBe(false)
    expect(isDue({ ...gym, archived: true }, MON)).toBe(false)
  })
})

describe('subtasks und Fortschritt', () => {
  it('filtert Subtasks nach Wochentag', () => {
    expect(subtasksFor(morning, MON).map((s) => s.id)).toEqual(['a', 'b'])
    expect(subtasksFor(morning, addDays(MON, 1)).map((s) => s.id)).toEqual(['a'])
  })

  it('ist komplett, wenn alle fälligen Subtasks erledigt sind', () => {
    const tue = addDays(MON, 1)
    const log = toggleItem(morning, tue, undefined, 'a')
    expect(log.complete).toBe(true)
    expect(toggleItem(morning, MON, undefined, 'a').complete).toBe(false)
  })

  it('zählt optionale Schritte nicht für „erledigt“', () => {
    const r: Routine = {
      ...morning,
      subtasks: [
        { id: 'a', title: 'Pflicht' },
        { id: 'o', title: 'Kür', optional: true },
      ],
    }
    const log = toggleItem(r, MON, undefined, 'a')
    expect(log.complete).toBe(true)
    expect(progress(r, MON, log)).toMatchObject({ ratio: 1, optionalDone: 0, optionalTotal: 1 })
    const all = toggleItem(r, MON, log, 'o')
    expect(progress(r, MON, all)).toMatchObject({ optionalDone: 1 })
    // Ring antippen behält erledigte optionale Schritte
    expect(setAll(r, MON, true, { done: ['o'], complete: false }).done.sort()).toEqual(['a', 'o'])
  })

  it('wertet nur optionale Schritte wie Pflicht', () => {
    const r: Routine = { ...morning, subtasks: [{ id: 'o', title: 'Kür', optional: true }] }
    expect(toggleItem(r, MON, undefined, 'o').complete).toBe(true)
    expect(progress(r, MON, undefined).optionalTotal).toBe(0)
  })

  it('nutzt SELF für Routinen ohne Subtasks', () => {
    const log = setAll(gym, MON, true)
    expect(log).toEqual({ done: [SELF], complete: true })
    expect(progress(gym, MON, log).ratio).toBe(1)
  })
})

describe('streak', () => {
  const logs: DayLogs = {
    [addDays(MON, -7)]: { g: { done: [SELF], complete: true } },
    [addDays(MON, -5)]: { g: { done: [SELF], complete: true } },
    [addDays(MON, -3)]: { g: { done: [SELF], complete: true } },
  }

  it('überspringt nicht fällige Tage und zählt offenen heutigen Tag nicht als Bruch', () => {
    expect(streak(gym, MON, logs)).toBe(3)
  })

  it('bricht bei einem verpassten fälligen Tag ab', () => {
    const missed = { ...logs }
    delete missed[addDays(MON, -5)]
    expect(streak(gym, MON, missed)).toBe(1)
  })

  it('zählt heute mit, wenn erledigt', () => {
    expect(streak(gym, MON, { ...logs, [MON]: { g: { done: [SELF], complete: true } } })).toBe(4)
  })
})

describe('dayRatio', () => {
  it('mittelt über alle fälligen Einheiten', () => {
    const logs: DayLogs = { [MON]: { m: { done: ['a'], complete: false } } }
    // Morgens: 1 von 2, Gym: 0 von 1
    expect(dayRatio([morning, gym], MON, logs)).toBeCloseTo(1 / 3)
    expect(dayRatio([gym], addDays(MON, 1), logs)).toBeNull()
  })
})
