/**
 * Signale am Blockende: Systembenachrichtigung, Vibration, Ton, Bildschirm wach halten.
 * Alles "best effort" – was das Gerät nicht kann, wird still übersprungen.
 *
 * Grenzen einer Web-App (Stand 2026):
 * - Benachrichtigungen: Android/Desktop ja. iOS nur, wenn die App zum Home-Bildschirm
 *   hinzugefügt wurde (ab iOS 16.4).
 * - Vibration: nur Android (Chrome, Firefox). iOS Safari unterstützt die Vibration API nicht.
 * - Läuft die App gar nicht (Tab geschlossen, Handy hat sie eingefroren), kann sie ohne
 *   Push-Server nichts auslösen. Deshalb zeigt die Status-Benachrichtigung die Endzeit an.
 */

export const TIMER_TAG = 'takt-timer'

export const canNotify = typeof window !== 'undefined' && 'Notification' in window
export const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator
export const canWakeLock = typeof navigator !== 'undefined' && 'wakeLock' in navigator

export function permission(): NotificationPermission | 'unsupported' {
  return canNotify ? Notification.permission : 'unsupported'
}

export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!canNotify) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

/** Optionen, die lib.dom (noch) nicht vollständig kennt. */
type Options = NotificationOptions & {
  vibrate?: number[]
  renotify?: boolean
  requireInteraction?: boolean
  actions?: { action: string; title: string }[]
}

export async function notify(title: string, options: Options = {}): Promise<boolean> {
  if (!canNotify || Notification.permission !== 'granted') return false
  const opts: Options = {
    icon: `${import.meta.env.BASE_URL}icons/pwa-192.png`,
    badge: `${import.meta.env.BASE_URL}icons/pwa-192.png`,
    lang: 'de',
    ...options,
  }
  try {
    // Android erlaubt nur Benachrichtigungen über den Service Worker.
    const reg = await registration()
    if (reg) await reg.showNotification(title, opts)
    else new Notification(title, opts)
    return true
  } catch {
    return false
  }
}

export async function clearNotifications(tag: string) {
  const reg = canNotify ? await registration() : null
  if (!reg) return
  for (const n of await reg.getNotifications({ tag })) n.close()
}

export function vibrate(pattern: number[]) {
  if (canVibrate) navigator.vibrate(pattern)
}

// --- Ton ---------------------------------------------------------------

let audio: AudioContext | null = null

/** Muss einmal in einer Nutzeraktion (z. B. Start-Button) aufgerufen werden, sonst bleibt es stumm. */
export function unlockAudio() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    audio = null
  }
}

/** Zwei ruhige Sinustöne. */
export function chime(high = true) {
  if (!audio) return
  const now = audio.currentTime
  const notes = high ? [659.25, 987.77] : [523.25, 659.25]
  notes.forEach((freq, i) => {
    const osc = audio!.createOscillator()
    const gain = audio!.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t = now + i * 0.22
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.18, t + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
    osc.connect(gain).connect(audio!.destination)
    osc.start(t)
    osc.stop(t + 1.3)
  })
}

// --- Bildschirm wach halten ---------------------------------------------

let lock: WakeLockSentinel | null = null
let wantLock = false

export async function keepAwake(on: boolean) {
  wantLock = on
  if (!canWakeLock) return
  if (on && !lock) {
    try {
      lock = await navigator.wakeLock.request('screen')
      lock.addEventListener('release', () => (lock = null))
    } catch {
      lock = null
    }
  } else if (!on && lock) {
    await lock.release()
    lock = null
  }
}

// Der Wake Lock fällt beim Wechsel in den Hintergrund weg und muss neu angefordert werden.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wantLock) void keepAwake(true)
  })
}
