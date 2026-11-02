/** Kalendertag im Format YYYY-MM-DD (lokale Zeit). */
export type DateKey = string

/** ISO-Wochentag: 1 = Montag … 7 = Sonntag. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export const WEEKDAYS: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 7]

const SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const
const LONG = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
  'Sonntag',
] as const

export const weekdayShort = (d: Weekday) => SHORT[d - 1]
export const weekdayLong = (d: Weekday) => LONG[d - 1]

const pad = (n: number) => String(n).padStart(2, '0')

export function toKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Der "logische" Tag: Bis zur Tagesgrenze (z. B. 3 Uhr) zählt die Nacht noch zum Vortag,
 * damit man spätabends noch die Abendroutine abhaken kann.
 */
export function logicalToday(now: Date, dayStartHour: number): DateKey {
  const shifted = new Date(now)
  if (now.getHours() < dayStartHour) shifted.setDate(shifted.getDate() - 1)
  return toKey(shifted)
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = fromKey(key)
  date.setDate(date.getDate() + days)
  return toKey(date)
}

export function weekdayOf(key: DateKey): Weekday {
  const js = fromKey(key).getDay()
  return (js === 0 ? 7 : js) as Weekday
}

/** Ganze Tage von a nach b (b − a). */
export function daysBetween(a: DateKey, b: DateKey): number {
  const ms = fromKey(b).getTime() - fromKey(a).getTime()
  return Math.round(ms / 86_400_000)
}

/** Die sieben Tage der Woche, in der `key` liegt. */
export function weekOf(key: DateKey, weekStart: Weekday): DateKey[] {
  const offset = (weekdayOf(key) - weekStart + 7) % 7
  const first = addDays(key, -offset)
  return WEEKDAYS.map((_, i) => addDays(first, i))
}

/** Wochentage in Anzeige-Reihenfolge, beginnend mit `weekStart`. */
export function orderedWeekdays(weekStart: Weekday): Weekday[] {
  return WEEKDAYS.map((_, i) => (((weekStart - 1 + i) % 7) + 1) as Weekday)
}

export function formatLongDate(key: DateKey): string {
  return fromKey(key).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
