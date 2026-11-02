import { logicalToday, type DateKey } from '../date'
import { setAll, toggleItem } from '../routines/schedule'
import type { Routine, RoutineLog } from '../routines/types'
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
  settings = $state<Settings>({ ...DEFAULT_SETTINGS })
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
      this.routines = data.routines
      this.logs = data.logs
      this.settings = data.settings
    } else {
      this.routines = starterRoutines(logicalToday(new Date(), DEFAULT_SETTINGS.dayStartHour))
      this.#persist()
    }
    this.#tick()
    setInterval(() => this.#tick(), 60_000)
    document.addEventListener('visibilitychange', () => this.#tick())
  }

  #tick() {
    const next = logicalToday(new Date(), this.settings.dayStartHour)
    if (next === this.today) return
    // Wer gerade "heute" ansieht, springt mit in den neuen Tag.
    if (this.selectedDay === this.today) this.selectedDay = next
    this.today = next
  }

  snapshot(): AppData {
    return $state.snapshot({
      version: 1 as const,
      routines: this.routines,
      logs: this.logs,
      settings: this.settings,
    })
  }

  #persist() {
    void this.#storage.save(this.snapshot())
  }

  // --- Abhaken -----------------------------------------------------------

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
    this.#writeLog(routine.id, day, setAll(routine, day, done))
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

  moveRoutine(id: string, delta: -1 | 1) {
    const from = this.routines.findIndex((r) => r.id === id)
    const to = from + delta
    if (from === -1 || to < 0 || to >= this.routines.length) return
    const next = [...this.routines]
    ;[next[from], next[to]] = [next[to], next[from]]
    this.routines = next
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
    this.routines = data.routines
    this.logs = data.logs
    this.settings = data.settings
    this.#persist()
    return true
  }

  resetAll() {
    this.routines = []
    this.logs = {}
    this.settings = { ...DEFAULT_SETTINGS }
    this.#persist()
  }
}

export const app = new AppState(new LocalStorageAdapter())
