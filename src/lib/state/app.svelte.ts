import { moveItem } from '../actions/sortable'
import { logicalToday, type DateKey } from '../date'
import { remindKey, remindKeyAt } from '../todos/todos'
import type { FocusSession } from '../focus/timer'
import { uid } from '../id'
import { setAll, toggleItem } from '../routines/schedule'
import type { Routine, RoutineLog } from '../routines/types'
import type { Todo } from '../todos/types'
import {
  DEFAULT_SETTINGS,
  normalize,
  type AppData,
  type Settings,
  type StorageAdapter,
} from '../storage/adapter'
import { LocalStorageAdapter } from '../storage/local'
import { starterRoutines } from './starter'

class AppState {
  routines = $state<Routine[]>([])
  logs = $state<AppData['logs']>({})
  todos = $state<Todo[]>([])
  sessions = $state<FocusSession[]>([])
  settings = $state<Settings>(structuredClone(DEFAULT_SETTINGS))
  /** Logischer heutiger Tag, aktualisiert sich über die Tagesgrenze hinweg. */
  today = $state<DateKey>(logicalToday(new Date(), DEFAULT_SETTINGS.dayStartHour))
  /** Der in der Heute-Ansicht ausgewählte Tag. */
  selectedDay = $state<DateKey>(this.today)

  activeRoutines = $derived(this.routines.filter((r) => !r.archived))

  #storage: StorageAdapter

  constructor(storage: StorageAdapter) {
    this.#storage = storage
  }

  async init() {
    const data = await this.#storage.load()
    if (data) {
      this.#apply(data)
    } else {
      this.routines = starterRoutines(logicalToday(new Date(), DEFAULT_SETTINGS.dayStartHour))
      this.#persist()
    }
    this.#tick()
    setInterval(() => this.#tick(), 60_000)
    document.addEventListener('visibilitychange', () => this.#tick())
  }

  #apply(data: AppData) {
    this.routines = data.routines
    this.logs = data.logs
    this.todos = data.todos
    this.sessions = data.sessions
    this.settings = data.settings
  }

  #tick() {
    const next = logicalToday(new Date(), this.settings.dayStartHour)
    if (next === this.today) return
    // Wer gerade "heute" ansieht, springt mit in den neuen Tag.
    if (this.selectedDay === this.today) this.selectedDay = next
    this.today = next
    this.#notify()
  }

  /** Logischer Tag zu einem Zeitpunkt (Tagesgrenze beachtet). */
  dayOf(time: number): DateKey {
    return logicalToday(new Date(time), this.settings.dayStartHour)
  }

  snapshot(): AppData {
    return $state.snapshot({
      version: 1 as const,
      routines: this.routines,
      logs: this.logs,
      todos: this.todos,
      sessions: this.sessions,
      settings: this.settings,
    })
  }

  #listeners = new Set<() => void>()

  /** Wird nach jeder gespeicherten Änderung und bei Tageswechsel aufgerufen. */
  onChange(fn: () => void) {
    this.#listeners.add(fn)
  }

  #notify() {
    for (const fn of this.#listeners) fn()
  }

  #persist() {
    void this.#storage.save(this.snapshot())
    this.#notify()
  }

  // --- Routinen abhaken --------------------------------------------------

  logFor(routineId: string, day: DateKey): RoutineLog | undefined {
    return this.logs[day]?.[routineId]
  }

  #writeLog(routineId: string, day: DateKey, log: RoutineLog) {
    const dayLogs = { ...this.logs[day] }
    if (log.done.length) dayLogs[routineId] = log
    else delete dayLogs[routineId]
    this.logs[day] = dayLogs
    this.#persist()
  }

  toggle(routine: Routine, day: DateKey, itemId: string) {
    this.#writeLog(routine.id, day, toggleItem(routine, day, this.logFor(routine.id, day), itemId))
  }

  setRoutineDone(routine: Routine, day: DateKey, done: boolean) {
    this.#writeLog(routine.id, day, setAll(routine, day, done, this.logFor(routine.id, day)))
  }

  // --- Routinen verwalten -----------------------------------------------

  saveRoutine(routine: Routine) {
    const index = this.routines.findIndex((r) => r.id === routine.id)
    if (index === -1) this.routines.push(routine)
    else this.routines[index] = routine
    this.#persist()
  }

  deleteRoutine(id: string) {
    this.routines = this.routines.filter((r) => r.id !== id)
    for (const day of Object.keys(this.logs)) {
      if (!this.logs[day][id]) continue
      const rest = { ...this.logs[day] }
      delete rest[id]
      this.logs[day] = rest
    }
    this.#persist()
  }

  reorderRoutines(from: number, to: number) {
    if (from === to || to < 0 || to >= this.routines.length) return
    this.routines = moveItem(this.routines, from, to)
    this.#persist()
  }

  // --- Aufgaben ----------------------------------------------------------

  /** Neue Aufgabe; mit `time` ("HH:MM") gibt es eine Erinnerung am Tag (bzw. heute). */
  addTodo(title: string, day: DateKey | null, time?: string) {
    this.todos.push({
      id: uid(),
      title,
      createdOn: this.today,
      ...(day ? { day } : {}),
      ...(time ? { remindAt: remindKey(day ?? this.today, time) } : {}),
    })
    this.#persist()
  }

  /** Erinnerung um `minutes` ab jetzt verschieben. */
  snoozeTodo(id: string, minutes: number) {
    const todo = this.todos.find((t) => t.id === id)
    if (!todo || todo.doneOn) return
    todo.remindAt = remindKeyAt(Date.now() + minutes * 60_000)
    this.#persist()
  }

  saveTodo(todo: Todo) {
    const index = this.todos.findIndex((t) => t.id === todo.id)
    if (index === -1) this.todos.push(todo)
    else this.todos[index] = todo
    this.#persist()
  }

  /** Erledigt-Status umschalten; erledigt wird am angezeigten (nicht zukünftigen) Tag. */
  toggleTodo(id: string, day: DateKey = this.today) {
    const todo = this.todos.find((t) => t.id === id)
    if (!todo) return
    if (todo.doneOn) delete todo.doneOn
    else todo.doneOn = day > this.today ? this.today : day
    this.#persist()
  }

  deleteTodo(id: string) {
    this.todos = this.todos.filter((t) => t.id !== id)
    this.#persist()
  }

  // --- Fokus-Log ---------------------------------------------------------

  addSession(session: Omit<FocusSession, 'id'>): string {
    const id = uid()
    this.sessions.push({ id, ...session })
    this.#persist()
    return id
  }

  rateSession(id: string, rating: number | undefined) {
    const s = this.sessions.find((x) => x.id === id)
    if (!s) return
    if (rating) s.rating = rating
    else delete s.rating
    this.#persist()
  }

  deleteSession(id: string) {
    this.sessions = this.sessions.filter((s) => s.id !== id)
    this.#persist()
  }

  // --- Einstellungen & Daten --------------------------------------------

  updateSettings(patch: Partial<Settings>) {
    this.settings = { ...this.settings, ...patch }
    this.#persist()
    this.#tick()
  }

  importData(raw: unknown): boolean {
    const data = normalize(raw)
    if (!data) return false
    this.#apply(data)
    this.#persist()
    return true
  }

  resetAll() {
    this.routines = []
    this.logs = {}
    this.todos = []
    this.sessions = []
    this.settings = structuredClone(DEFAULT_SETTINGS)
    this.#persist()
  }
}

export const app = new AppState(new LocalStorageAdapter())
