import { describe, expect, it } from 'vitest'
import { maskKey } from './mask'

describe('maskKey', () => {
  it('masks a long key to first 3 + dots + last 4, hiding the middle', () => {
    const key = 'sk-abcdefghijklmnopqrstuvwxyz'
    const masked = maskKey(key)
    expect(masked).toBe('sk-••••wxyz')
    expect(masked).not.toContain(key.slice(3, -4))
  })

  it('masks a short key (<= 8 chars) to just dots', () => {
    expect(maskKey('sk-1234')).toBe('••••')
  })

  it('masks an empty key to dots', () => {
    expect(maskKey('')).toBe('••••')
  })
})
