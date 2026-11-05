/**
 * Systembenachrichtigungen der Android-App (Capacitor). Im Browser sind alle Funktionen
 * wirkungslos; dort gelten weiter die Web-Signale aus signals.ts.
 */
import { Capacitor } from '@capacitor/core'
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications'
import type { PlannedReminder } from '../reminders/plan'
import { TODO_ID_MIN } from '../reminders/plan'

export const isNative = Capacitor.isNativePlatform()

export const CHANNEL = {
  reminders: 'takt-reminders',
  timer: 'takt-timer',
  status: 'takt-status',
} as const

/** IDs 1–99 gehören dem Timer: 1 = Status, 2–9 = geplante Phasenenden. */
export const TIMER_STATUS_ID = 1
const TIMER_END_IDS = [2, 3, 4, 5, 6, 7, 8, 9]

export type NotificationAction =
  { action: 'done' | 'snooze' | 'open'; todoId: string } | { action: 'open'; url: string }

export async function setupNative(onAction: (a: NotificationAction) => void) {
  if (!isNative) return
  await Promise.all([
    LocalNotifications.createChannel({
      id: CHANNEL.reminders,
      name: 'Erinnerungen',
      description: 'Aufgaben zu einer Uhrzeit und tägliche Erinnerung an Offenes',
      importance: 4,
      vibration: true,
      visibility: 1,
    }),
    LocalNotifications.createChannel({
      id: CHANNEL.timer,
      name: 'Fokus-Timer',
      description: 'Ende von Fokus und Pause',
      importance: 5,
      vibration: true,
      visibility: 1,
    }),
    LocalNotifications.createChannel({
      id: CHANNEL.status,
      name: 'Laufender Takt',
      description: 'Stehende Anzeige, solange ein Takt läuft',
      importance: 2,
      vibration: false,
      visibility: 1,
    }),
  ])
  await LocalNotifications.registerActionTypes({
    types: [
      {
        id: 'todo',
        actions: [
          { id: 'done', title: 'Erledigt' },
          { id: 'snooze', title: 'In 1 Stunde' },
        ],
      },
    ],
  })
  await LocalNotifications.addListener(
    'localNotificationActionPerformed',
    ({ actionId, notification }) => {
      const extra = (notification.extra ?? {}) as { todoId?: string; url?: string }
      if (extra.todoId) {
        const action = actionId === 'done' || actionId === 'snooze' ? actionId : 'open'
        onAction({ action, todoId: extra.todoId })
      } else {
        onAction({ action: 'open', url: extra.url ?? '#/heute' })
      }
    },
  )
}

export interface PermissionState {
  notifications: boolean
  exact: boolean
}

export async function checkPermissions(): Promise<PermissionState> {
  if (!isNative) return { notifications: false, exact: false }
  const [p, e] = await Promise.all([
    LocalNotifications.checkPermissions(),
    LocalNotifications.checkExactNotificationSetting().catch(() => ({ exact_alarm: 'granted' })),
  ])
  return { notifications: p.display === 'granted', exact: e.exact_alarm === 'granted' }
}

export async function requestPermissions(): Promise<PermissionState> {
  if (!isNative) return { notifications: false, exact: false }
  const p = await LocalNotifications.requestPermissions()
  return { ...(await checkPermissions()), notifications: p.display === 'granted' }
}

/** Öffnet die Systemeinstellung „Wecker & Erinnerungen“ (nur nötig, wenn exact = false). */
export async function openExactAlarmSettings() {
  if (isNative) await LocalNotifications.changeExactNotificationSetting()
}

// --- Erinnerungen -----------------------------------------------------------

/**
 * Ersetzt alle geplanten Erinnerungen durch `plan`. Bereits angezeigte Aufgaben-Erinnerungen
 * verschwinden, sobald die Aufgabe erledigt, gelöscht oder verschoben ist.
 */
export async function syncReminders(
  plan: PlannedReminder[],
  sticky: boolean,
  isStillDue: (todoId: string) => boolean,
) {
  if (!isNative) return
  const { notifications: pending } = await LocalNotifications.getPending()
  const stale = pending.filter((n) => n.id >= 100)
  if (stale.length)
    await LocalNotifications.cancel({ notifications: stale.map((n) => ({ id: n.id })) })

  const { notifications: delivered } = await LocalNotifications.getDeliveredNotifications()
  const gone = delivered.filter((n) => {
    if (n.id < 100) return false
    const todoId = (n.extra as { todoId?: string } | undefined)?.todoId
    // Tageserinnerungen bleiben stehen; Aufgaben nur, solange sie fällig sind.
    if (n.id >= TODO_ID_MIN) return !todoId || !isStillDue(todoId)
    return false
  })
  if (gone.length) await LocalNotifications.removeDeliveredNotifications({ notifications: gone })

  if (!plan.length) return
  await LocalNotifications.schedule({
    notifications: plan.map((r): LocalNotificationSchema => ({
      id: r.id,
      title: r.title,
      body: r.body,
      channelId: CHANNEL.reminders,
      schedule: { at: new Date(r.at), allowWhileIdle: true },
      ...(r.kind === 'todo'
        ? {
            actionTypeId: 'todo',
            extra: { todoId: r.todoId },
            // „Bleibt da, bis erledigt“: nicht wegwischbar, verschwindet über „Erledigt“.
            ongoing: sticky,
            autoCancel: !sticky,
          }
        : { extra: { url: '#/heute' }, autoCancel: true }),
    })),
  })
}

export async function removeDelivered(ids: number[]) {
  if (!isNative || !ids.length) return
  const { notifications } = await LocalNotifications.getDeliveredNotifications()
  const hit = notifications.filter((n) => ids.includes(n.id))
  if (hit.length) await LocalNotifications.removeDeliveredNotifications({ notifications: hit })
}

/** Testmeldung auf dem Timer-Kanal, ohne laufende Planung anzufassen. */
export async function testNotification(delayMs: number) {
  if (!isNative) return
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 99,
        title: 'Takt',
        body: 'So kommt das Signal am Blockende.',
        channelId: CHANNEL.timer,
        schedule: { at: new Date(Date.now() + delayMs), allowWhileIdle: true },
        autoCancel: true,
      },
    ],
  })
}

// --- Timer ------------------------------------------------------------------

export interface TimerAlert {
  at: number
  title: string
  body: string
}

/**
 * Plant die Phasenenden und zeigt optional eine stehende Statusanzeige.
 * `clearDelivered`: auch schon angezeigte Ende-Meldungen entfernen (bei Nutzeraktionen).
 */
export async function syncTimer(
  alerts: TimerAlert[],
  status: string | null,
  clearDelivered: boolean,
) {
  if (!isNative) return
  await LocalNotifications.cancel({
    notifications: [TIMER_STATUS_ID, ...TIMER_END_IDS].map((id) => ({ id })),
  })
  await removeDelivered(clearDelivered ? [TIMER_STATUS_ID, ...TIMER_END_IDS] : [TIMER_STATUS_ID])
  const notifications: LocalNotificationSchema[] = alerts
    .slice(0, TIMER_END_IDS.length)
    .map((a, i) => ({
      id: TIMER_END_IDS[i],
      title: a.title,
      body: a.body,
      channelId: CHANNEL.timer,
      schedule: { at: new Date(a.at), allowWhileIdle: true },
      extra: { url: '#/fokus' },
      autoCancel: true,
    }))
  if (status) {
    notifications.push({
      id: TIMER_STATUS_ID,
      title: 'Takt',
      body: status,
      channelId: CHANNEL.status,
      ongoing: true,
      autoCancel: false,
      extra: { url: '#/fokus' },
    })
  }
  if (notifications.length) await LocalNotifications.schedule({ notifications })
}
