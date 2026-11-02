import type { Weekday } from '../date'
import type { DayLogs, Routine } from '../routines/types'

export type Theme = 'system' | 'light' | 'dark'

export interface Settings {
  /** Stunde, ab der ein neuer Tag beginnt (0–6). */
  dayStartHour: number
  weekStart: Weekday
  theme: Theme
  /** Erledigte Routinen automatisch einklappen. */
  collapseDone: boolean
}

export interface AppData {
  version: 1
  routines: Routine[]
  logs: DayLogs
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
}

/** Ergänzt fehlende Felder und hebt ältere Formate auf die aktuelle Version. */
export function normalize(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Partial<AppData>
  if (data.version !== 1) return null
  return {
    version: 1,
    routines: Array.isArray(data.routines) ? data.routines : [],
    logs: data.logs && typeof data.logs === 'object' ? data.logs : {},
    settings: { ...DEFAULT_SETTINGS, ...data.settings },
  }
}
