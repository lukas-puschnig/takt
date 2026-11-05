import type { DateKey } from '../date'

/** Einmalige Aufgabe (im Gegensatz zu Routinen). */
export interface Todo {
  id: string
  title: string
  notes?: string
  /** Geplanter Tag; ohne Tag = „Irgendwann“. */
  day?: DateKey
  /** Tag, an dem die Aufgabe erledigt wurde. */
  doneOn?: DateKey
  createdOn: DateKey
}
