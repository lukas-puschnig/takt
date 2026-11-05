import type { Weekday } from '../date'
import {
  DEFAULT_PROFILES,
  type FocusMode,
  type FocusProfile,
  type FocusSession,
} from '../focus/timer'
import type { DayLogs, Routine } from '../routines/types'
import type { Todo } from '../todos/types'

export type Theme = 'system' | 'light' | 'dark'

export interface Settings {
  /** Stunde, ab der ein neuer Tag beginnt (0–6). */
  dayStartHour: number
  weekStart: Weekday
  theme: Theme
  /** Erledigte Routinen automatisch einklappen. */
  collapseDone: boolean

  /** Blocklängen je Modus. */
  profiles: Record<FocusMode, FocusProfile>
  /** Nach der Pause den nächsten Takt sofort starten. */
  autoStartFocus: boolean

  /** Systembenachrichtigung am Ende einer Phase. */
  notify: boolean
  /** Während eines Takts eine stehende Benachrichtigung mit der Endzeit zeigen. */
  statusNotify: boolean
  vibrate: boolean
  sound: boolean
  /** Bildschirm wach halten, solange der Timer läuft. */
  wakeLock: boolean

  /** Tägliche Erinnerung an Offenes, "HH:MM" oder leer = aus (Android-App). */
  dailyReminder: string
  /** Routinen in der täglichen Erinnerung mitzählen. */
  summaryRoutines: boolean
  /** Aufgaben-Erinnerungen bleiben stehen, bis die Aufgabe erledigt ist. */
  stickyReminders: boolean
}

export interface AppData {
  version: 1
  routines: Routine[]
  logs: DayLogs
  todos: Todo[]
  sessions: FocusSession[]
  settings: Settings
}

/**
 * Schicht zwischen App und Speicher. Heute localStorage, später z. B. Nextcloud (WebDAV)
 * oder Supabase – die App spricht nur mit diesem Interface.
 */
export interface StorageAdapter {
  load(): Promise<AppData | null>
  save(data: AppData): Promise<void>
}

export const DEFAULT_SETTINGS: Settings = {
  dayStartHour: 3,
  weekStart: 1,
  theme: 'system',
  collapseDone: true,
  profiles: structuredClone(DEFAULT_PROFILES),
  autoStartFocus: false,
  notify: false,
  statusNotify: false,
  vibrate: true,
  sound: true,
  wakeLock: true,
  dailyReminder: '',
  summaryRoutines: true,
  stickyReminders: true,
}

/** Ergänzt fehlende Felder und hebt ältere Formate auf die aktuelle Version. */
export function normalize(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Partial<AppData>
  if (data.version !== 1) return null
  const settings = { ...DEFAULT_SETTINGS, ...data.settings }
  settings.profiles = {
    deep: { ...DEFAULT_PROFILES.deep, ...data.settings?.profiles?.deep },
    normal: { ...DEFAULT_PROFILES.normal, ...data.settings?.profiles?.normal },
  }
  return {
    version: 1,
    routines: Array.isArray(data.routines) ? data.routines : [],
    logs: data.logs && typeof data.logs === 'object' ? data.logs : {},
    todos: Array.isArray(data.todos) ? data.todos : [],
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
    settings,
  }
}
