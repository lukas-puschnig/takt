/**
 * Akzentfarben für Routinen. Die Werte stehen als --routine-<key> in tokens.css (hell und
 * dunkel). Nur für Ringe, Häkchen und Punkte verwenden, nie für Text.
 */
export const ROUTINE_COLORS = [
  { key: 'fuchsia', label: 'Fuchsia' },
  { key: 'koralle', label: 'Koralle' },
  { key: 'bernstein', label: 'Bernstein' },
  { key: 'salbei', label: 'Salbei' },
  { key: 'petrol', label: 'Petrol' },
  { key: 'himmel', label: 'Himmel' },
  { key: 'indigo', label: 'Indigo' },
  { key: 'pflaume', label: 'Pflaume' },
] as const

export function routineColor(key: string | undefined): string {
  return ROUTINE_COLORS.some((c) => c.key === key)
    ? `var(--routine-${key})`
    : 'var(--color-primary)'
}

/** Farbe, wenn alle Pflichtschritte erledigt sind, die optionalen aber noch nicht. */
export const partialColor = (color: string) => `color-mix(in oklab, ${color} 45%, transparent)`
