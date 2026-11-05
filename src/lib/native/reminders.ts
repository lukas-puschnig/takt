import { planReminders, todoNotificationId } from '../reminders/plan'
import { app } from '../state/app.svelte'
import { remindTime } from '../todos/todos'
import {
  isNative,
  removeDelivered,
  requestPermissions,
  setupNative,
  syncReminders,
  type NotificationAction,
  type NotificationExtra,
} from './notifications'

const SETUP_KEY = 'takt:native-setup'

function handleAction({ actionId, extra }: NotificationAction) {
  if (extra.todoId) {
    const todo = app.todos.find((t) => t.id === extra.todoId)
    if (actionId === 'done') {
      if (todo && !todo.doneOn) app.toggleTodo(todo.id)
      void removeDelivered([todoNotificationId(extra.todoId)])
      return
    }
    if (actionId === 'snooze') {
      app.snoozeTodo(extra.todoId, 60)
      void removeDelivered([todoNotificationId(extra.todoId)])
      return
    }
  }

  if (extra.routineId && extra.day) {
    const routine = app.routines.find((r) => r.id === extra.routineId)
    if (routine && actionId === 'done') {
      const log = app.logFor(routine.id, extra.day)
      if (extra.subtaskId) {
        if (!log?.done.includes(extra.subtaskId)) app.toggle(routine, extra.day, extra.subtaskId)
      } else if (!log?.complete) {
        app.setRoutineDone(routine, extra.day, true)
      }
      // Angezeigte Erinnerungen räumt der folgende Abgleich weg (nicht mehr fällig).
      return
    }
  }

  if (actionId === 'tap' || actionId === 'done' || actionId === 'snooze') {
    if (extra.url) {
      location.hash = extra.url
    } else {
      app.selectedDay = extra.day ?? app.today
      location.hash = '#/heute'
    }
  }
}

/** Ist das, woran die Benachrichtigung erinnert, noch offen? */
function stillDue(extra: NotificationExtra): boolean {
  if (extra.todoId) {
    const t = app.todos.find((x) => x.id === extra.todoId)
    return !!t && !t.doneOn && !!t.remindAt && remindTime(t.remindAt) <= Date.now()
  }
  if (extra.routineId && extra.day) {
    const r = app.routines.find((x) => x.id === extra.routineId)
    const log = app.logFor(extra.routineId, extra.day)
    if (!r || log?.complete) return false
    return !extra.subtaskId || !log?.done.includes(extra.subtaskId)
  }
  return false
}

let timer: ReturnType<typeof setTimeout> | undefined

export function scheduleReminderSync() {
  if (!isNative) return
  clearTimeout(timer)
  timer = setTimeout(() => {
    const s = app.settings
    const plan = planReminders(Date.now(), app.todos, app.routines, app.logs, {
      dailyReminder: s.dailyReminder,
      summaryRoutines: s.summaryRoutines,
      dayStartHour: s.dayStartHour,
    })
    void syncReminders(plan, s.stickyReminders, stillDue).catch((e) =>
      console.error('Erinnerungen konnten nicht geplant werden', e),
    )
  }, 400)
}

export async function initNative() {
  if (!isNative) return
  document.documentElement.dataset.native = 'android'
  await setupNative(handleAction)
  // Beim ersten Start in der App: Berechtigung holen und Signale einschalten.
  if (!localStorage.getItem(SETUP_KEY)) {
    const perm = await requestPermissions()
    if (perm.notifications) app.updateSettings({ notify: true, dailyReminder: '18:00' })
    localStorage.setItem(SETUP_KEY, '1')
  }
  app.onChange(scheduleReminderSync)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleReminderSync()
  })
  scheduleReminderSync()
}
