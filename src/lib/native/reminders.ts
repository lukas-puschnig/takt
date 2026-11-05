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
} from './notifications'

const SETUP_KEY = 'takt:native-setup'

function handleAction(a: NotificationAction) {
  if ('url' in a) {
    location.hash = a.url
    return
  }
  const todo = app.todos.find((t) => t.id === a.todoId)
  if (a.action === 'done') {
    if (todo && !todo.doneOn) app.toggleTodo(todo.id)
    void removeDelivered([todoNotificationId(a.todoId)])
  } else if (a.action === 'snooze') {
    app.snoozeTodo(a.todoId, 60)
    void removeDelivered([todoNotificationId(a.todoId)])
  } else {
    app.selectedDay = app.today
    location.hash = '#/heute'
  }
}

/** Aufgabe ist (noch) fällig: offen und Erinnerungszeit erreicht. */
function isStillDue(todoId: string): boolean {
  const t = app.todos.find((x) => x.id === todoId)
  return !!t && !t.doneOn && !!t.remindAt && remindTime(t.remindAt) <= Date.now()
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
    void syncReminders(plan, s.stickyReminders, isStillDue).catch((e) =>
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
