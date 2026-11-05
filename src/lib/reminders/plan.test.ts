import { describe, expect, it } from 'vitest'
import type { Routine } from '../routines/types'
import type { Todo } from '../todos/types'
import {
  atOnDay,
  MAX_REPEATS,
  planReminders,
  planRoutineReminders,
  SUMMARY_ID,
  todoNotificationId,
  TODO_ID_MIN,
} from './plan'

// Mittwoch, 4.11.2026, 10:00 Ortszeit
const NOW = new Date(2026, 10, 4, 10, 0).getTime()
const OPTS = { dailyReminder: '', summaryRoutines: true, dayStartHour: 3 }

const todo = (id: string, extra: Partial<Todo> = {}): Todo => ({
  id,
  title: id,
  createdOn: '2026-11-01',
  ...extra,
})

const evening: Routine = {
  id: 'r',
  title: 'Abends',
  schedule: { type: 'weekly', days: [1, 2, 3, 4, 5, 6, 7] },
  subtasks: [],
  createdOn: '2026-10-01',
}

describe('planReminders', () => {
  it('plant Aufgaben-Erinnerungen nur in der Zukunft und nur offen', () => {
    const plan = planReminders(
      NOW,
      [
        todo('a', { remindAt: '2026-11-04T14:30' }),
        todo('past', { remindAt: '2026-11-04T09:00' }),
        todo('done', { remindAt: '2026-11-05T09:00', doneOn: '2026-11-04' }),
      ],
      [],
      {},
      OPTS,
    )
    expect(plan).toEqual([
      expect.objectContaining({
        kind: 'todo',
        todoId: 'a',
        at: new Date(2026, 10, 4, 14, 30).getTime(),
      }),
    ])
  })

  it('fasst Offenes täglich zusammen und lässt leere Tage aus', () => {
    const todos = [
      todo('Steuer', { day: '2026-11-03' }), // überfällig
      todo('Call', { day: '2026-11-05' }),
      todo('Fertig', { day: '2026-11-04', doneOn: '2026-11-04' }),
    ]
    const plan = planReminders(NOW, todos, [], {}, { ...OPTS, dailyReminder: '18:00' })
    expect(plan[0]).toMatchObject({
      id: SUMMARY_ID,
      at: new Date(2026, 10, 4, 18, 0).getTime(),
      title: 'Noch 1 Sache offen',
      body: 'Steuer',
    })
    expect(plan[1]).toMatchObject({ title: 'Noch 2 Sachen offen', body: 'Steuer, Call' })
    expect(plan).toHaveLength(8)
  })

  it('zählt erledigte Routinen heute nicht mehr', () => {
    const logs = { '2026-11-04': { r: { done: ['_self'], complete: true } } }
    const plan = planReminders(NOW, [], [evening], logs, { ...OPTS, dailyReminder: '21:00' })
    expect(plan[0].at).toBe(new Date(2026, 10, 5, 21, 0).getTime())
    expect(plan[0].body).toBe('Abends')
  })

  it('erinnert an Routinen wiederholt, bis sie erledigt sind', () => {
    const r: Routine = { ...evening, time: '10:30', reminder: { every: 15 } }
    const plan = planRoutineReminders(NOW, [r], {}, 3, 1)
    expect(plan[0]).toMatchObject({ kind: 'routine', routineId: 'r', title: 'Abends' })
    expect(plan[0].at).toBe(new Date(2026, 10, 4, 10, 30).getTime())
    expect(plan[1].at - plan[0].at).toBe(15 * 60_000)
    expect(plan).toHaveLength(MAX_REPEATS)
    const done = { '2026-11-04': { r: { done: ['_self'], complete: true } } }
    expect(planRoutineReminders(NOW, [r], done, 3, 1)).toEqual([])
  })

  it('nervt bei wichtigen Schritten ab der Uhrzeit und hört nach dem Abhaken auf', () => {
    const r: Routine = {
      ...evening,
      subtasks: [
        { id: 'pill', title: 'Tablette', emoji: '💊', time: '22:00', nag: 10 },
        { id: 'tea', title: 'Tee', time: '21:00' },
      ],
    }
    const plan = planRoutineReminders(NOW, [r], {}, 3, 1)
    const pill = plan.filter((p) => p.subtaskId === 'pill')
    expect(pill[0]).toMatchObject({ title: '💊 Tablette', body: 'Abends · wichtig' })
    // 22:00 bis Tagesgrenze 3:00 alle 10 min, höchstens MAX_REPEATS
    expect(pill).toHaveLength(Math.min(30, MAX_REPEATS))
    expect(plan.filter((p) => p.subtaskId === 'tea')).toHaveLength(1)
    const logs = { '2026-11-04': { r: { done: ['pill'], complete: false } } }
    expect(planRoutineReminders(NOW, [r], logs, 3, 1).some((p) => p.subtaskId === 'pill')).toBe(
      false,
    )
  })

  it('legt Uhrzeiten vor der Tagesgrenze auf den Folgetag', () => {
    expect(atOnDay('2026-11-04', '01:30', 3)).toBe(new Date(2026, 10, 5, 1, 30).getTime())
    expect(atOnDay('2026-11-04', '07:00', 3)).toBe(new Date(2026, 10, 4, 7, 0).getTime())
  })

  it('vergibt stabile IDs im Aufgabenbereich', () => {
    expect(todoNotificationId('abc')).toBe(todoNotificationId('abc'))
    expect(todoNotificationId('abc')).not.toBe(todoNotificationId('abd'))
    expect(todoNotificationId('x')).toBeGreaterThanOrEqual(TODO_ID_MIN)
    expect(todoNotificationId('x')).toBeLessThan(2 ** 31)
  })
})
