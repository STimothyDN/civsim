import { describe, expect, it } from 'vitest'
import { getValueAtPath, parsePath, removeValueAtPath, setValueAtPath } from './path'

describe('path utilities', () => {
  it('parses object and array path segments', () => {
    expect(parsePath('provinces[2].counties[0].yields.food')).toEqual([
      'provinces',
      2,
      'counties',
      0,
      'yields',
      'food',
    ])
    expect(parsePath('')).toEqual([])
  })

  it('gets, sets, and removes values safely', () => {
    const data = {
      provinces: [
        {
          counties: [{ features: { forest: true } }],
        },
      ],
    }

    expect(getValueAtPath(data, 'provinces[0].counties[0].features.forest')).toBe(true)
    expect(setValueAtPath(data, 'provinces[0].counties[0].features.river', true)).toBe(true)
    expect(getValueAtPath(data, 'provinces[0].counties[0].features.river')).toBe(true)
    expect(removeValueAtPath(data, 'provinces[0].counties[0].features.forest')).toBe(true)
    expect(getValueAtPath(data, 'provinces[0].counties[0].features.forest')).toBeUndefined()
    expect(setValueAtPath(data, 'provinces[2].name', 'Missing')).toBe(false)
  })
})
