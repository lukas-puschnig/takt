import {
  addDays,
  daysBetween,
  formatLongDate,
  fromKey,
  toKey,
  weekdayOf,
  type DateKey,
  type Weekday,
} from '../date'
import type { Todo } from './types'

/**
 * Aufgaben für einen Tag.
 * - Heute: alles, was bis heute geplant und offen ist (Überfälliges rutscht automatisch mit).
 * - Zukunft: genau an dem Tag geplant.
 * - Vergangenheit: nur, was an dem Tag erledigt wurde.
 */
export function todosFor(todos: Todo[], day: DateKey, today: DateKey) {
  const open =
    day < today
      ? []
      : todos.filter((t) => !t.doneOn && t.day && (day === today ? t.day <= today : t.day === day))
  // Überfälliges zuerst, ältestes oben.
  open.sort((a, b) => (a.day! < b.day! ? -1 : a.day! > b.day! ? 1 : 0))
  // In der Vorschau bleiben vorzeitig erledigte Aufgaben an ihrem geplanten Tag sichtbar.
  const done = todos.filter((t) => t.doneOn === day || (day > today && t.doneOn && t.day === day))
  return { open, done }
}

export const somedayTodos = (todos: Todo[]) => todos.filter((t) => !t.day && !t.doneOn)

/** Anzahl offener Aufgaben, die an einem Tag anstehen (für die Wochenleiste). */
export function openCount(todos: Todo[], day: DateKey, today: DateKey): number {
  if (day < today) return 0
  return todosFor(todos, day, today).open.length
}

const WEEKDAY_WORDS: Record<string, Weekday> = {
  montag: 1,
  mo: 1,
  dienstag: 2,
  di: 2,
  mittwoch: 3,
  mi: 3,
  donnerstag: 4,
  do: 4,
  freitag: 5,
  fr: 5,
  samstag: 6,
  sa: 6,
  sonntag: 7,
  so: 7,
}

/** Nächster Termin dieses Wochentags nach heute (heute selbst heißt „heute“). */
export function nextWeekday(today: DateKey, wd: Weekday): DateKey {
  const ahead = (wd - weekdayOf(today) + 7) % 7 || 7
  return addDays(today, ahead)
}

/** Erkennt ein Tageswort, z. B. „morgen“, „fr“, „nächste woche“, „12.11.“. */
function resolveWord(word: string, today: DateKey, weekStart: Weekday): DateKey | null | undefined {
  const w = word
    .toLowerCase()
    .replace(/^am\s+/, '')
    .replace(/\.$/, '')
  if (w === 'heute') return today
  if (w === 'morgen') return addDays(today, 1)
  if (w === 'übermorgen' || w === 'uebermorgen') return addDays(today, 2)
  if (w === 'irgendwann') return null
  if (w === 'wochenende') return weekdayOf(today) >= 6 ? today : nextWeekday(today, 6)
  if (w === 'nächste woche' || w === 'naechste woche') return nextWeekday(today, weekStart)
  if (w in WEEKDAY_WORDS) return nextWeekday(today, WEEKDAY_WORDS[w])
  const m = /^(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?$/.exec(w)
  if (m) {
    const [, d, mo, y] = m
    const year = y ? (y.length === 2 ? 2000 + Number(y) : Number(y)) : Number(today.slice(0, 4))
    const key = `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
    if (toKey(fromKey(key)) !== key) return undefined
    // Ohne Jahr: liegt das Datum zurück, ist das nächste Jahr gemeint.
    if (!y && key < today) return `${year + 1}${key.slice(4)}`
    return key
  }
  return undefined
}

const WORDS = [
  'nächste woche',
  'naechste woche',
  'übermorgen',
  'uebermorgen',
  'irgendwann',
  'wochenende',
  'morgen',
  'heute',
  ...Object.keys(WEEKDAY_WORDS),
]
const DATE = '\\d{1,2}\\.\\d{1,2}\\.?(?:\\d{2,4})?'
const word = (words: string[]) =>
  `(?:(?:am|bis|ab)\\s+)?(?:${words.map((w) => w.replace(' ', '\\s+')).join('|')}|${DATE})\\.?`
const AT_END = new RegExp(`\\s+(${word(WORDS)})$`, 'i')
// Am Anfang keine Kürzel wie „so“ oder „do“, sonst landet „So viel zu tun“ am Sonntag.
const AT_START = new RegExp(`^(${word(WORDS.filter((w) => w.length > 2))})\\s+`, 'i')

// „um 9“, „um 9:30“, „9 Uhr“, „9:30 Uhr“, „14:30“
const TIME_AT_END =
  /\s+(?:um\s+(\d{1,2})(?:[:.](\d{2}))?(?:\s*uhr)?|(\d{1,2})(?:[:.](\d{2}))?\s*uhr|(\d{1,2}):(\d{2}))$/i

export interface QuickAdd {
  title: string
  /** undefined = kein Tageswort gefunden, null = „irgendwann“. */
  day: DateKey | null | undefined
  /** Uhrzeit "HH:MM" für eine Erinnerung. */
  time?: string
}

function takeTime(text: string): { rest: string; time?: string } {
  const m = TIME_AT_END.exec(text)
  if (!m) return { rest: text }
  const h = Number(m[1] ?? m[3] ?? m[5])
  const min = Number(m[2] ?? m[4] ?? m[6] ?? 0)
  if (h > 23 || min > 59) return { rest: text }
  const rest = text.slice(0, m.index).trim()
  if (!rest) return { rest: text }
  return { rest, time: `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}` }
}

function takeDay(text: string, today: DateKey, weekStart: Weekday) {
  for (const re of [AT_END, AT_START]) {
    const m = re.exec(text)
    if (!m) continue
    const day = resolveWord(m[1].replace(/^(bis|ab)\s+/i, ''), today, weekStart)
    const rest = text.replace(re, '').trim()
    if (day !== undefined && rest) return { rest, day }
  }
  return { rest: text, day: undefined }
}

/**
 * Zerlegt eine Schnelleingabe wie „Zahnarzt anrufen morgen um 9“ in Titel, Tag und Uhrzeit.
 * Uhrzeit und Tag dürfen in beliebiger Reihenfolge am Ende stehen, der Tag auch am Anfang.
 */
export function parseQuickAdd(input: string, today: DateKey, weekStart: Weekday = 1): QuickAdd {
  const first = takeTime(input.trim().replace(/\s+/g, ' '))
  const { rest, day } = takeDay(first.rest, today, weekStart)
  // Uhrzeit vor dem Tag: „Call um 14:30 freitag“
  const { rest: title, time } = first.time ? { rest, time: first.time } : takeTime(rest)
  return time ? { title, day, time } : { title, day }
}

/** Erinnerung als lokales "YYYY-MM-DDTHH:MM". */
export const remindKey = (day: DateKey, time: string) => `${day}T${time}`

/** Erinnerungs-Schlüssel für einen Zeitpunkt (ms). */
export function remindKeyAt(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return remindKey(toKey(d), `${pad(d.getHours())}:${pad(d.getMinutes())}`)
}

/** Zeitpunkt (ms) einer Erinnerung in lokaler Zeit. */
export function remindTime(remindAt: string): number {
  const [day, time] = remindAt.split('T')
  const [h, m] = time.split(':').map(Number)
  const d = fromKey(day)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

/** Kurze Beschreibung eines Tages relativ zu heute. */
export function relativeDay(day: DateKey | null | undefined, today: DateKey): string {
  if (!day) return 'Irgendwann'
  const diff = daysBetween(today, day)
  if (diff === 0) return 'Heute'
  if (diff === 1) return 'Morgen'
  if (diff === 2) return 'Übermorgen'
  if (diff === -1) return 'Gestern'
  if (diff > 0 && diff < 7) return formatLongDate(day).split(',')[0]
  return fromKey(day).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
