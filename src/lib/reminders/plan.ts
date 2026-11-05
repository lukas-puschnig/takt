import { logicalToday, type DateKey } from '../date'
import { isDue } from '../routines/schedule'
import type { DayLogs, Routine } from '../routines/types'
import { remindTime } from '../todos/todos'
import type { Todo } from '../todos/types'

/** Eine vom Betriebssystem zu planende Erinnerung. */
export interface PlannedReminder {
  id: number
  at: number
  title: string
  body: string
  kind: 'todo' | 'summary'
  todoId?: string
}

export interface ReminderOptions {
  /** Tägliche Erinnerung an Offenes, "HH:MM" oder leer = aus. */
  dailyReminder: string
  /** Routinen in der täglichen Erinnerung mitzählen. */
  summaryRoutines: boolean
  dayStartHour: number
}

/** Feste IDs (klein) für Timer, 100–199 für die Tageserinnerung, ab 1000 für Aufgaben. */
export const SUMMARY_ID = 100
export const TODO_ID_MIN = 1000

/** Stabile Ganzzahl-ID je Aufgabe (Android braucht int32). */
export function todoNotificationId(todoId: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < todoId.length; i++) {
    h ^= todoId.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return TODO_ID_MIN + ((h >>> 0) % (0x7fffffff - TODO_ID_MIN))
}

const list = (items: string[], max = 3) =>
  items.length > max ? `${items.slice(0, max).join(', ')} +${items.length - max}` : items.join(', ')

/** Was am logischen Tag `day` noch offen ist (Aufgaben inkl. Überfälligem, Routinen). */
export function openOn(
  day: DateKey,
  today: DateKey,
  todos: Todo[],
  routines: Routine[],
  logs: DayLogs,
  withRoutines: boolean,
) {
  const openTodos = todos.filter((t) => !t.doneOn && t.day && t.day <= day)
  const openRoutines = withRoutines
    ? routines.filter((r) => isDue(r, day) && !(day <= today && logs[day]?.[r.id]?.complete))
    : []
  return { openTodos, openRoutines }
}

/** Alle Erinnerungen, die ab `now` anstehen. */
export function planReminders(
  now: number,
  todos: Todo[],
  routines: Routine[],
  logs: DayLogs,
  opts: ReminderOptions,
): PlannedReminder[] {
  const out: PlannedReminder[] = []

  for (const t of todos) {
    if (t.doneOn || !t.remindAt) continue
    const at = remindTime(t.remindAt)
    if (at <= now) continue
    out.push({
      id: todoNotificationId(t.id),
      at,
      title: t.title,
      body: t.notes ?? 'Erinnerung',
      kind: 'todo',
      todoId: t.id,
    })
  }

  if (/^\d{2}:\d{2}$/.test(opts.dailyReminder)) {
    const [h, m] = opts.dailyReminder.split(':').map(Number)
    const today = logicalToday(new Date(now), opts.dayStartHour)
    const active = routines.filter((r) => !r.archived)
    // Eine Woche im Voraus; die App plant bei jeder Änderung und jedem Start neu.
    for (let i = 0; i < 8; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() + i)
      date.setHours(h, m, 0, 0)
      const at = date.getTime()
      if (at <= now) continue
      const day = logicalToday(date, opts.dayStartHour)
      const { openTodos, openRoutines } = openOn(
        day,
        today,
        todos,
        active,
        logs,
        opts.summaryRoutines,
      )
      const parts: string[] = []
      if (openTodos.length) parts.push(list(openTodos.map((t) => t.title)))
      if (openRoutines.length) parts.push(list(openRoutines.map((r) => r.title)))
      if (!parts.length) continue
      const n = openTodos.length + openRoutines.length
      out.push({
        id: SUMMARY_ID + i,
        at,
        title: n === 1 ? 'Noch 1 Sache offen' : `Noch ${n} Sachen offen`,
        body: parts.join(' · '),
        kind: 'summary',
      })
    }
  }

  return out
}
