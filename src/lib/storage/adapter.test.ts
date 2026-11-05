import { describe, expect, it } from 'vitest'
import { BREAK_IDEAS } from '../focus/breaks'
import { normalize } from './adapter'

describe('normalize', () => {
  it('ergänzt Pausenvorschläge bei älteren Daten', () => {
    const data = normalize({ version: 1, settings: { theme: 'dark' } })
    expect(data?.settings.breakIdeas).toEqual([...BREAK_IDEAS])
    expect(data?.settings.theme).toBe('dark')
  })

  it('übernimmt eigene Vorschläge und verwirft leere', () => {
    const data = normalize({ version: 1, settings: { breakIdeas: ['Tee', ' ', 3] } })
    expect(data?.settings.breakIdeas).toEqual(['Tee'])
  })
})
