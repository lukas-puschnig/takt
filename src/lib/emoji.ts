/**
 * Vollständige Emoji-Liste mit deutschen Namen und Suchbegriffen (emojibase-data, CLDR).
 * Wird erst geladen, wenn jemand „Alle Emojis“ öffnet, damit der Start schlank bleibt.
 */
export interface Emoji {
  emoji: string
  label: string
  /** Kleingeschriebener Suchtext aus Name und Schlagwörtern. */
  search: string
  group: number
}

/** Gruppen in emojibase-Reihenfolge; 2 (Hautfarben-Bausteine) wird ausgelassen. */
export const EMOJI_GROUPS = [
  { id: 0, icon: '😀', label: 'Smileys' },
  { id: 1, icon: '👋', label: 'Menschen' },
  { id: 3, icon: '🌿', label: 'Natur' },
  { id: 4, icon: '🍎', label: 'Essen' },
  { id: 5, icon: '✈️', label: 'Orte' },
  { id: 6, icon: '⚽', label: 'Aktivitäten' },
  { id: 7, icon: '💡', label: 'Objekte' },
  { id: 8, icon: '❤️', label: 'Symbole' },
  { id: 9, icon: '🏁', label: 'Flaggen' },
] as const

interface Raw {
  unicode: string
  label: string
  tags?: string[]
  group?: number
}

let cache: Promise<Emoji[]> | undefined

export function loadEmojis(): Promise<Emoji[]> {
  cache ??= import('emojibase-data/de/compact.json')
    .then((m) => toEmojis(m.default))
    .catch((err: unknown) => {
      cache = undefined
      throw err
    })
  return cache
}

export function toEmojis(raw: Raw[]): Emoji[] {
  return raw.flatMap((r) =>
    r.group === undefined || r.group === 2
      ? []
      : [
          {
            emoji: r.unicode,
            label: r.label,
            search: [r.label, ...(r.tags ?? [])].join(' ').toLowerCase(),
            group: r.group,
          },
        ],
  )
}

/**
 * Alle Suchwörter müssen als Teilstring vorkommen („rot herz“ findet „rotes Herz“).
 * Treffer im Namen stehen vor Treffern in den Schlagwörtern.
 */
export function searchEmojis(list: Emoji[], query: string, limit = 120): Emoji[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const inLabel: Emoji[] = []
  const inTags: Emoji[] = []
  for (const e of list) {
    if (!words.every((w) => e.search.includes(w))) continue
    const label = e.label.toLowerCase()
    ;(words.every((w) => label.includes(w)) ? inLabel : inTags).push(e)
  }
  return [...inLabel, ...inTags].slice(0, limit)
}
