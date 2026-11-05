import { describe, expect, it } from 'vitest'
import { loadEmojis, searchEmojis } from './emoji'

describe('Emojis', () => {
  it('lädt die vollständige Liste ohne Hautfarben-Bausteine', async () => {
    const all = await loadEmojis()
    expect(all.length).toBeGreaterThan(1500)
    expect(all.some((e) => e.group === 2)).toBe(false)
    expect(all.some((e) => e.emoji === '🦦')).toBe(true)
  })

  it('findet auf Deutsch, Namenstreffer zuerst', async () => {
    const all = await loadEmojis()
    expect(searchEmojis(all, 'hund')[0].label.toLowerCase()).toContain('hund')
    expect(searchEmojis(all, 'rot herz').map((e) => e.emoji)).toContain('❤️')
    expect(searchEmojis(all, '  ')).toEqual([])
  })
})
