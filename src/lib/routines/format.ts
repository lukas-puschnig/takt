import { orderedWeekdays, weekdayShort, type Weekday } from '../date'
import type { Schedule } from './types'

const WORKDAYS: Weekday[] = [1, 2, 3, 4, 5]
const WEEKEND: Weekday[] = [6, 7]

const sameDays = (a: Weekday[], b: Weekday[]) =>
  a.length === b.length && b.every((d) => a.includes(d))

export function describeDays(days: Weekday[], weekStart: Weekday = 1): string {
  if (days.length === 7) return 'Täglich'
  if (sameDays(days, WORKDAYS)) return 'Werktags'
  if (sameDays(days, WEEKEND)) return 'Am Wochenende'
  if (!days.length) return 'Nie'
  return orderedWeekdays(weekStart)
    .filter((d) => days.includes(d))
    .map(weekdayShort)
    .join(', ')
}

export function describeSchedule(schedule: Schedule, weekStart: Weekday = 1): string {
  if (schedule.type === 'weekly') return describeDays(schedule.days, weekStart)
  return schedule.every === 1 ? 'Täglich' : `Alle ${schedule.every} Tage`
}

export const PRESETS: { label: string; days: Weekday[] }[] = [
  { label: 'Täglich', days: [1, 2, 3, 4, 5, 6, 7] },
  { label: 'Werktags', days: WORKDAYS },
  { label: 'Wochenende', days: WEEKEND },
]

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
