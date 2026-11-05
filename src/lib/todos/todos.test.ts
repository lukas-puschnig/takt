import { describe, expect, it } from 'vitest'
import { addDays } from '../date'
import { nextWeekday, openCount, parseQuickAdd, somedayTodos, todosFor } from './todos'
import type { Todo } from './types'

// 2026-11-04 ist ein Mittwoch.
const WED = '2026-11-04'

describe('parseQuickAdd', () => {
  it('erkennt Tageswörter am Ende und am Anfang', () => {
    expect(parseQuickAdd('Zahnarzt anrufen morgen', WED)).toEqual({
      title: 'Zahnarzt anrufen',
      day: '2026-11-05',
    })
    expect(parseQuickAdd('Morgen Zahnarzt anrufen', WED).day).toBe('2026-11-05')
    expect(parseQuickAdd('Steuer übermorgen', WED).day).toBe('2026-11-06')
    expect(parseQuickAdd('Paket abholen heute', WED).day).toBe(WED)
    expect(parseQuickAdd('Buch lesen irgendwann', WED)).toEqual({ title: 'Buch lesen', day: null })
  })

  it('löst Wochentage auf den nächsten Termin auf', () => {
    expect(parseQuickAdd('Bericht abgeben am Freitag', WED).day).toBe('2026-11-06')
    expect(parseQuickAdd('Bericht abgeben fr', WED).day).toBe('2026-11-06')
    expect(parseQuickAdd('Team-Call mittwoch', WED).day).toBe('2026-11-11')
    expect(parseQuickAdd('Planen nächste Woche', WED).day).toBe('2026-11-09')
    expect(parseQuickAdd('Ausmisten wochenende', WED).day).toBe('2026-11-07')
  })

  it('erkennt Datumsangaben', () => {
    expect(parseQuickAdd('Abgabe 12.11.', WED).day).toBe('2026-11-12')
    expect(parseQuickAdd('Abgabe bis 3.1.', WED).day).toBe('2027-01-03')
    expect(parseQuickAdd('Abgabe 31.2.', WED).day).toBeUndefined()
  })

  it('erkennt Uhrzeiten vor oder nach dem Tag', () => {
    expect(parseQuickAdd('Zahnarzt anrufen morgen um 9', WED)).toEqual({
      title: 'Zahnarzt anrufen',
      day: '2026-11-05',
      time: '09:00',
    })
    expect(parseQuickAdd('Call um 14:30 freitag', WED)).toEqual({
      title: 'Call',
      day: '2026-11-06',
      time: '14:30',
    })
    expect(parseQuickAdd('Wäsche 18 Uhr', WED)).toEqual({
      title: 'Wäsche',
      day: undefined,
      time: '18:00',
    })
    expect(parseQuickAdd('Treffen 9:05', WED).time).toBe('09:05')
    expect(parseQuickAdd('Raum 25 Uhr', WED).time).toBeUndefined()
    expect(parseQuickAdd('Version 2.10 testen', WED)).toEqual({
      title: 'Version 2.10 testen',
      day: undefined,
    })
  })

  it('lässt normale Titel in Ruhe', () => {
    expect(parseQuickAdd('Morgenroutine anpassen', WED)).toEqual({
      title: 'Morgenroutine anpassen',
      day: undefined,
    })
    expect(parseQuickAdd('morgen', WED)).toEqual({ title: 'morgen', day: undefined })
    expect(parseQuickAdd('So viel zu tun', WED).day).toBeUndefined()
    expect(parseQuickAdd('  Mails   sortieren ', WED).title).toBe('Mails sortieren')
  })
})

describe('nextWeekday', () => {
  it('liegt immer nach heute', () => {
    expect(nextWeekday(WED, 3)).toBe(addDays(WED, 7))
    expect(nextWeekday(WED, 4)).toBe(addDays(WED, 1))
  })
})

describe('todosFor', () => {
  const todos: Todo[] = [
    { id: 'late', title: 'Überfällig', day: addDays(WED, -2), createdOn: WED },
    { id: 'today', title: 'Heute', day: WED, createdOn: WED },
    { id: 'tomorrow', title: 'Morgen', day: addDays(WED, 1), createdOn: WED },
    { id: 'some', title: 'Irgendwann', createdOn: WED },
    { id: 'done', title: 'Fertig', day: WED, doneOn: addDays(WED, -1), createdOn: WED },
  ]

  it('zeigt heute Überfälliges zuerst', () => {
    expect(todosFor(todos, WED, WED).open.map((t) => t.id)).toEqual(['late', 'today'])
  })

  it('zeigt zukünftige Tage exakt', () => {
    expect(todosFor(todos, addDays(WED, 1), WED).open.map((t) => t.id)).toEqual(['tomorrow'])
    expect(openCount(todos, addDays(WED, 1), WED)).toBe(1)
  })

  it('zeigt an vergangenen Tagen nur Erledigtes', () => {
    const past = todosFor(todos, addDays(WED, -1), WED)
    expect(past.open).toEqual([])
    expect(past.done.map((t) => t.id)).toEqual(['done'])
  })

  it('sammelt Aufgaben ohne Tag', () => {
    expect(somedayTodos(todos).map((t) => t.id)).toEqual(['some'])
  })
})
