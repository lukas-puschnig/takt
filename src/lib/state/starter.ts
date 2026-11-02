import type { DateKey } from '../date'
import { uid as id } from '../id'
import type { Routine } from '../routines/types'

/** Beispiel-Routinen beim ersten Start, damit die App nicht leer ist. Frei änderbar. */
export function starterRoutines(today: DateKey): Routine[] {
  return [
    {
      id: id(),
      title: 'Morgens',
      time: '07:00',
      schedule: { type: 'weekly', days: [1, 2, 3, 4, 5, 6, 7] },
      createdOn: today,
      subtasks: [
        { id: id(), title: 'Open Books oder Vierfüßler-Rotation' },
        { id: id(), title: 'BWS-Extension über Foam Roller' },
        { id: id(), title: 'Flankenatmung, 5–8 Atemzüge' },
        { id: id(), title: 'Seated Twist' },
        { id: id(), title: 'Wichtigste Aufgabe des Tages festlegen', days: [1, 2, 3, 4, 5] },
      ],
    },
    {
      id: id(),
      title: 'Abends',
      time: '21:00',
      schedule: { type: 'weekly', days: [1, 2, 3, 4, 5, 6, 7] },
      createdOn: today,
      subtasks: [
        { id: id(), title: 'Dehn-Schwerpunkt, 5 min', days: [2, 4, 6, 7] },
        { id: id(), title: 'Spanisch: Duolingo und Konjugato' },
        { id: id(), title: 'Fokus-Tagebuch: Fokus 1–5, Ort, Schlaf' },
      ],
    },
  ]
}
