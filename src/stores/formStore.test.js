import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AUTOSAVE_KEY, createAutosavePayload } from '../domain/autosave'
import { useFormStore } from './formStore'

function sampleTemplate() {
  return {
    country: {
      basic_info: { name: 'Khmer Empire', leader: 'Jayavarman VII' },
      state_religion: 'Zoroastrianism',
    },
    province_groups: ['Capital Region', 'Frontier'],
    global_religions: ['Zoroastrianism', 'Taoism'],
    provinces: [
      {
        name: 'Capital',
        group: 'Capital Region',
        is_national_capital: true,
        is_regional_capital: true,
        population: 10,
        religions: [{ name: 'Zoroastrianism', followers: 9 }],
        counties: [],
      },
      {
        name: 'Harbor',
        group: 'Capital Region',
        is_national_capital: false,
        is_regional_capital: false,
        population: 8,
        religions: [{ name: 'Taoism', followers: 5 }],
        counties: [],
      },
    ],
  }
}

describe('formStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('renames and removes province groups across province assignments', () => {
    const store = useFormStore()
    store.loadTemplate(sampleTemplate(), { silent: true })

    store.renameProvinceGroup(0, 'Core')
    expect(store.currentData.provinces.map((province) => province.group)).toEqual(['Core', 'Core'])

    store.removeProvinceGroup(0)
    expect(store.currentData.provinces.map((province) => province.group)).toEqual([null, null])
  })

  it('renames global religions across state and province references', () => {
    const store = useFormStore()
    store.loadTemplate(sampleTemplate(), { silent: true })

    store.renameGlobalReligion(0, 'Buddhism')

    expect(store.currentData.country.state_religion).toBe('Buddhism')
    expect(store.currentData.provinces[0].religions[0].name).toBe('Buddhism')
    expect(store.currentData.provinces[1].religions[0].name).toBe('Taoism')
  })

  it('keeps national and regional capitals unique in their scopes', () => {
    const store = useFormStore()
    store.loadTemplate(sampleTemplate(), { silent: true })

    store.setNationalCapital(1)
    expect(store.currentData.provinces.map((province) => province.is_national_capital)).toEqual([false, true])

    store.setRegionalCapital(1)
    expect(store.currentData.provinces.map((province) => province.is_regional_capital)).toEqual([false, true])
  })

  it('sorts closest provinces immediately after distance edits', () => {
    const store = useFormStore()
    store.loadTemplate(
      {
        ...sampleTemplate(),
        provinces: [
          {
            name: 'Capital',
            closest_provinces: [
              { province_name: 'Far', distance: 9 },
              { province_name: 'Middle', distance: 5 },
              { province_name: 'Near', distance: 2 },
            ],
            counties: [],
          },
        ],
      },
      { silent: true }
    )

    expect(store.currentData.provinces[0].closest_provinces.map((entry) => entry.province_name).slice(0, 3)).toEqual([
      'Near',
      'Middle',
      'Far',
    ])

    store.setValueAtPath('provinces[0].closest_provinces[2].distance', 1)

    expect(store.currentData.provinces[0].closest_provinces.map((entry) => entry.province_name).slice(0, 3)).toEqual([
      'Far',
      'Near',
      'Middle',
    ])
  })

  it('hydrates valid autosave data and clears invalid drafts', () => {
    const store = useFormStore()
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(createAutosavePayload(sampleTemplate(), '2026-04-30T12:00:00.000Z')))

    expect(store.hydrateFromAutosave()).toBe(true)
    expect(store.currentData.country.basic_info.name).toBe('Khmer Empire')
    expect(store.lastAutosavedAt).toBe('2026-04-30T12:00:00.000Z')

    const freshStore = useFormStore()
    freshStore.currentData = null
    localStorage.setItem(AUTOSAVE_KEY, '{bad json')
    expect(freshStore.hydrateFromAutosave()).toBe(false)
    expect(localStorage.getItem(AUTOSAVE_KEY)).toBeNull()
  })
})
