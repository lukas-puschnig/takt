import type { DateKey, Weekday } from '../date'

export type Schedule =
  /** An bestimmten Wochentagen; alle sieben = täglich. */
  | { type: 'weekly'; days: Weekday[] }
  /** Alle N Tage, gezählt ab `start`. */
  | { type: 'interval'; every: number; start: DateKey }

export interface Subtask {
  id: string
  title: string
  /** Optional eingeschränkt auf Wochentage, sonst immer, wenn die Routine fällig ist. */
  days?: Weekday[]
}

export interface Routine {
  id: string
  title: string
  notes?: string
  /** Optionale Uhrzeit "HH:MM" als Orientierung, z. B. "07:00". */
  time?: string
  schedule: Schedule
  subtasks: Subtask[]
  /** Routine gilt erst ab diesem Tag (Streaks und Verlauf beginnen hier). */
  createdOn: DateKey
  archived?: boolean
}

/** Stand einer Routine an einem Tag. */
export interface RoutineLog {
  /** Abgehakte Subtask-IDs (bzw. SELF bei Routinen ohne Subtasks). */
  done: string[]
  /** Momentaufnahme beim Abhaken, damit spätere Änderungen den Verlauf nicht verfälschen. */
  complete: boolean
}

export type DayLogs = Record<DateKey, Record<string, RoutineLog>>

/** Platzhalter-ID für Routinen ohne Subtasks. */
export const SELF = '_self'
