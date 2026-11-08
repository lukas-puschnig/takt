import { addDays, fromKey, logicalToday, type DateKey } from '../date'
import { isDue, subtasksFor } from '../routines/schedule'
import type { DayLogs, Routine } from '../routines/types'
import { remindTime } from '../todos/todos'
import type { Todo } from '../todos/types'

/** Eine vom Betriebssystem zu planende Erinnerung. */
export interface PlannedReminder {
  id: number
  at: number
  title: string
  body: string
  kind: 'todo' | 'summary' | 'routine'
  todoId?: string
  /** Bei Routinen: welche Routine bzw. welcher Schritt an welchem (logischen) Tag. */
  routineId?: string
  subtaskId?: string
  day?: DateKey
  /** Erinnerungen derselben Sache ersetzen sich: angezeigt bleibt nur die neueste. */
  group?: string
}

/** Gruppen mit diesem Präfix räumt die Android-App auf (NotificationCleanup.java). */
export const GROUP_PREFIX = 'takt:'

export interface ReminderOptions {
  /** Tägliche Erinnerung an Offenes, "HH:MM" oder leer = aus. */
  dailyReminder: string
  /** Routinen in der täglichen Erinnerung mitzählen. */
  summaryRoutines: boolean
  dayStartHour: number
}

/** Feste IDs (klein) für Timer, 100–199 für die Tageserinnerung, ab 1000 für den Rest. */
export const SUMMARY_ID = 100
/**
 * Tageserinnerungen rotieren über so viele IDs (je Kalendertag eine). Neu planen mit einer
 * ID, die gerade angezeigt wird, würde die Anzeige entfernen; bei 8 Tagen Vorlauf kollidiert
 * so höchstens eine über eine Woche alte Meldung.
 */
const SUMMARY_SLOTS = 16

const summaryId = (date: Date) => {
  const day = Math.round(
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86_400_000,
  )
  return SUMMARY_ID + (((day % SUMMARY_SLOTS) + SUMMARY_SLOTS) % SUMMARY_SLOTS)
}
export const TODO_ID_MIN = 1000
/** Android begrenzt geplante Alarme pro App (ca. 500); wir bleiben deutlich darunter. */
export const MAX_PLANNED = 400
/** Höchstens so viele Wiederholungen je Sache und Tag. */
export const MAX_REPEATS = 36

/** Stabile Ganzzahl-ID je Schlüssel (Android braucht int32). */
function hashId(key: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return TODO_ID_MIN + ((h >>> 0) % (0x7fffffff - TODO_ID_MIN))
}

export const todoNotificationId = (todoId: string) => hashId(todoId)

const list = (items: string[], max = 3) =>
  items.length > max ? `${items.slice(0, max).join(', ')} +${items.length - max}` : items.join(', ')

const label = (s: { emoji?: string; title: string }) => [s.emoji, s.title].filter(Boolean).join(' ')

/** Zeitpunkt einer Uhrzeit am logischen Tag (vor der Tagesgrenze = nach Mitternacht). */
export function atOnDay(day: DateKey, time: string, dayStartHour: number): number {
  const [h, m] = time.split(':').map(Number)
  const d = fromKey(h < dayStartHour ? addDays(day, 1) : day)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

/** Ende des logischen Tages (Tagesgrenze am Folgetag). */
export function dayEnd(day: DateKey, dayStartHour: number): number {
  const d = fromKey(addDays(day, 1))
  d.setHours(dayStartHour, 0, 0, 0)
  return d.getTime()
}

/** Erste Erinnerung um `start`, dann alle `every` Minuten bis Tagesende. */
function repeats(start: number, every: number, end: number): number[] {
  if (!every) return [start]
  const out: number[] = []
  for (let t = start; t < end && out.length < MAX_REPEATS; t += every * 60_000) out.push(t)
  return out
}

/** Erinnerungen für Routinen (zur Uhrzeit) und Schritte mit Uhrzeit, bis sie erledigt sind. */
export function planRoutineReminders(
  now: number,
  routines: Routine[],
  logs: DayLogs,
  dayStartHour: number,
  horizonDays = 3,
): PlannedReminder[] {
  const out: PlannedReminder[] = []
  const today = logicalToday(new Date(now), dayStartHour)
  for (let i = 0; i < horizonDays; i++) {
    const day = addDays(today, i)
    const end = dayEnd(day, dayStartHour)
    for (const r of routines) {
      if (r.archived || !isDue(r, day)) continue
      const log = logs[day]?.[r.id]
      if (log?.complete) continue
      const push = (key: string, times: number[], base: Omit<PlannedReminder, 'id' | 'at'>) =>
        times.forEach((at, n) => {
          if (at > now) out.push({ ...base, id: hashId(`${key}:${day}:${n}`), at })
        })

      if (r.time && r.reminder) {
        const open = subtasksFor(r, day).filter((s) => !s.optional && !log?.done.includes(s.id))
        push(`r:${r.id}`, repeats(atOnDay(day, r.time, dayStartHour), r.reminder.every, end), {
          kind: 'routine',
          title: r.title,
          body: open.length ? `Noch offen: ${list(open.map(label))}` : 'Steht noch aus',
          routineId: r.id,
          day,
          group: `${GROUP_PREFIX}r:${r.id}`,
        })
      }
      for (const s of subtasksFor(r, day)) {
        if (!s.time || log?.done.includes(s.id)) continue
        push(`s:${r.id}:${s.id}`, repeats(atOnDay(day, s.time, dayStartHour), s.nag ?? 0, end), {
          kind: 'routine',
          title: label(s),
          body: s.nag ? `${r.title} · wichtig` : r.title,
          routineId: r.id,
          subtaskId: s.id,
          day,
          group: `${GROUP_PREFIX}s:${r.id}:${s.id}`,
        })
      }
    }
  }
  return out
}

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

/** Alle Erinnerungen, die ab `now` anstehen (früheste zuerst, höchstens MAX_PLANNED). */
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
        id: summaryId(date),
        at,
        title: n === 1 ? 'Noch 1 Sache offen' : `Noch ${n} Sachen offen`,
        body: parts.join(' · '),
        kind: 'summary',
        group: `${GROUP_PREFIX}summary`,
      })
    }
  }

  out.push(...planRoutineReminders(now, routines, logs, opts.dayStartHour))
  return out.sort((a, b) => a.at - b.at).slice(0, MAX_PLANNED)
}
