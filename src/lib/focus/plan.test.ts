import { describe, expect, it } from 'vitest'
import { blendProfile, defaultWindow, planDay, timeOnDay } from './plan'
import { DEFAULT_PROFILES } from './timer'

const MIN = 60_000
const T0 = new Date(2026, 10, 5, 9, 0).getTime()

describe('blendProfile', () => {
  it('mischt zwischen Normal und Deep Work', () => {
    const { normal, deep } = DEFAULT_PROFILES
    expect(blendProfile(normal, deep, 0)).toEqual(normal)
    expect(blendProfile(normal, deep, 1)).toEqual(deep)
    expect(blendProfile(normal, deep, 0.5)).toMatchObject({ focus: 40, short: 8 })
  })
})

describe('Zeitfenster', () => {
  it('schlägt ab jetzt drei Stunden vor', () => {
    expect(defaultWindow(new Date(2026, 10, 5, 9, 2).getTime())).toEqual({
      from: '09:05',
      to: '12:00',
    })
    expect(defaultWindow(new Date(2026, 10, 5, 22, 0).getTime()).to).toBe('23:30')
  })

  it('legt „bis“ vor „von“ auf den nächsten Tag', () => {
    const start = timeOnDay('23:00', T0)
    expect(timeOnDay('01:00', T0, start) - start).toBe(2 * 60 * MIN)
  })
})

describe('planDay', () => {
  it('füllt das Fenster exakt', () => {
    const plan = planDay(T0, T0 + 3 * 60 * MIN, 1, DEFAULT_PROFILES)
    const last = plan.slots.at(-1)!
    expect(plan.slots[0].start).toBe(T0)
    expect(last.end).toBe(T0 + 180 * MIN)
    expect(last.kind).toBe('focus')
    // Slots lückenlos
    plan.slots.slice(1).forEach((s, i) => expect(s.start).toBe(plan.slots[i].end))
    expect(plan.blocks.at(-1)!.pause).toBe(0)
  })

  it('wählt Taktzahl nach Deep/Light-Anteil', () => {
    const deep = planDay(T0, T0 + 180 * MIN, 1, DEFAULT_PROFILES)
    const light = planDay(T0, T0 + 180 * MIN, 0, DEFAULT_PROFILES)
    expect(deep.blocks).toHaveLength(3) // 3 × ~50 + 2 Pausen
    expect(light.blocks.length).toBeGreaterThan(deep.blocks.length)
    expect(deep.mode).toBe('deep')
    expect(light.mode).toBe('normal')
  })

  it('setzt lange Pausen nach jedem n-ten Takt', () => {
    const plan = planDay(T0, T0 + 240 * MIN, 0, DEFAULT_PROFILES) // alle 4 Takte
    expect(plan.blocks[3].long).toBe(true)
    expect(plan.blocks[3].pause).toBe(15 * MIN)
    expect(plan.blocks[0].long).toBe(false)
  })

  it('liefert für zu kurze Fenster keinen Plan, für kurze einen Takt', () => {
    expect(planDay(T0, T0 + 5 * MIN, 1, DEFAULT_PROFILES).blocks).toEqual([])
    const one = planDay(T0, T0 + 40 * MIN, 1, DEFAULT_PROFILES)
    expect(one.blocks).toEqual([{ focus: 40 * MIN, pause: 0, long: false }])
  })
})
