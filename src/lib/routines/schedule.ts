import { addDays, daysBetween, weekdayOf, type DateKey } from '../date'
import { SELF, type DayLogs, type Routine, type RoutineLog, type Subtask } from './types'

export function isDue(routine: Routine, day: DateKey): boolean {
  if (routine.archived || day < routine.createdOn) return false
  const { schedule } = routine
  switch (schedule.type) {
    case 'weekly':
      return schedule.days.includes(weekdayOf(day))
    case 'interval': {
      const diff = daysBetween(schedule.start, day)
      return diff >= 0 && diff % Math.max(1, schedule.every) === 0
    }
  }
}

/** Subtasks, die an diesem Tag dran sind. */
export function subtasksFor(routine: Routine, day: DateKey): Subtask[] {
  const wd = weekdayOf(day)
  return routine.subtasks.filter((s) => !s.days?.length || s.days.includes(wd))
}

/**
 * IDs, die für diesen Tag abgehakt werden müssen; ohne Subtasks nur SELF.
 * Optionale Schritte zählen nicht – außer alle sind optional, dann zählen alle.
 */
export function requiredIds(routine: Routine, day: DateKey): string[] {
  const subs = subtasksFor(routine, day)
  if (!subs.length) return [SELF]
  const mandatory = subs.filter((s) => !s.optional)
  return (mandatory.length ? mandatory : subs).map((s) => s.id)
}

/** Optionale Schritte des Tages, die nicht schon als Pflicht zählen. */
export function optionalIds(routine: Routine, day: DateKey): string[] {
  const required = new Set(requiredIds(routine, day))
  return subtasksFor(routine, day)
    .filter((s) => s.optional && !required.has(s.id))
    .map((s) => s.id)
}

export function progress(routine: Routine, day: DateKey, log: RoutineLog | undefined) {
  const required = requiredIds(routine, day)
  const optional = optionalIds(routine, day)
  const isDone = (id: string) => !!log?.done.includes(id)
  const done = required.filter(isDone).length
  const optionalDone = optional.filter(isDone).length
  return {
    done,
    total: required.length,
    ratio: done / required.length,
    optionalDone,
    optionalTotal: optional.length,
  }
}

/** Neuer Log-Eintrag nach dem Umschalten eines Subtasks (oder SELF). */
export function toggleItem(
  routine: Routine,
  day: DateKey,
  log: RoutineLog | undefined,
  id: string,
): RoutineLog {
  const current = new Set(log?.done ?? [])
  if (current.has(id)) current.delete(id)
  else current.add(id)
  return withCompletion(routine, day, [...current])
}

/** Alle Pflichtschritte abhaken (bereits erledigte optionale bleiben) bzw. alles zurücksetzen. */
export function setAll(
  routine: Routine,
  day: DateKey,
  done: boolean,
  log?: RoutineLog,
): RoutineLog {
  if (!done) return withCompletion(routine, day, [])
  const ids = new Set([...(log?.done ?? []), ...requiredIds(routine, day)])
  return withCompletion(routine, day, [...ids])
}

function withCompletion(routine: Routine, day: DateKey, done: string[]): RoutineLog {
  const required = requiredIds(routine, day)
  return { done, complete: required.every((id) => done.includes(id)) }
}

/**
 * Aufeinanderfolgende fällige Tage, an denen die Routine erledigt wurde, rückwärts ab `today`.
 * Ein noch offener heutiger Tag bricht die Serie nicht.
 */
export function streak(routine: Routine, today: DateKey, logs: DayLogs): number {
  let count = 0
  let day = today
  if (isDue(routine, day) && !logs[day]?.[routine.id]?.complete) day = addDays(day, -1)
  // Obergrenze schützt vor Endlosschleifen bei kaputten Daten.
  for (let i = 0; i < 3660 && day >= routine.createdOn; i++, day = addDays(day, -1)) {
    if (!isDue(routine, day)) continue
    if (!logs[day]?.[routine.id]?.complete) break
    count++
  }
  return count
}

/** Anteil erledigter Einheiten über alle an einem Tag fälligen Routinen (null = nichts fällig). */
export function dayRatio(routines: Routine[], day: DateKey, logs: DayLogs): number | null {
  let done = 0
  let total = 0
  for (const r of routines) {
    if (!isDue(r, day)) continue
    const log = logs[day]?.[r.id]
    // Abgeschlossene Tage nach Momentaufnahme werten, offene nach aktuellem Stand.
    const p = progress(r, day, log)
    total += p.total
    done += log?.complete ? p.total : p.done
  }
  return total ? done / total : null
}
