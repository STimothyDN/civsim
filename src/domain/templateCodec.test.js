import { describe, expect, it } from 'vitest'
import { buildExportTemplate, normalizeTemplateInput } from './templateCodec'

describe('templateCodec', () => {
  it('normalizes enriched imports without coercing scalar strings', () => {
    const normalized = normalizeTemplateInput({
      country: {
        basic_info: { name: 'Khmer Empire', leader: 'Jayavarman VII' },
        total_population: '845',
        state_religion: 'Zoroastrianism',
      },
      province_groups: [{ name: 'Capital Region', regional_population: 100 }],
      global_religions: [{ name: 'Zoroastrianism' }],
      provinces: [
        {
          name: 'Angkor Thom',
          is_capital: true,
          population: '28',
          dominant_religion: 'Zoroastrianism',
          provincial_population: 123,
          assemblypeople: 28,
          prelates: 16,
          counties: [{ improvement: 'Farm' }],
        },
      ],
    })

    expect(normalized.province_groups).toEqual(['Capital Region'])
    expect(normalized.global_religions).toEqual(['Zoroastrianism'])
    expect(normalized.country.total_population).toBe('845')
    expect(normalized.provinces[0].population).toBe('28')
    expect(normalized.provinces[0].is_national_capital).toBe(true)
    expect(normalized.provinces[0]).not.toHaveProperty('is_capital')
    expect(normalized.provinces[0]).not.toHaveProperty('provincial_population')
    expect(normalized.provinces[0]).not.toHaveProperty('dominant_religion')
    expect(normalized.provinces[0].closest_provinces).toHaveLength(5)
    expect(normalized.provinces[0].closest_provinces[0]).toEqual({ province_name: '', distance: null })
    expect(normalized.provinces[0].counties[0].tile_id).toBe('tile_1')
    expect(normalized.provinces[0].counties[0].distance_from_center).toBeNull()
    expect(normalized.provinces[0].counties[0].improvement).toEqual({ name: 'Farm', buildings: {}, great_works: {} })
  })

  it('keeps closest provinces sorted from closest to furthest', () => {
    const normalized = normalizeTemplateInput({
      country: { basic_info: { name: 'Test', leader: '' } },
      province_groups: [],
      global_religions: [],
      provinces: [
        {
          name: 'Capital',
          closest_provinces: [
            { province_name: 'Far', distance: 12 },
            { province_name: 'Nearest', distance: 2 },
            { province_name: 'Unknown', distance: null },
            { province_name: 'Middle', distance: 7 },
            { province_name: 'Nearer', distance: 4 },
            { province_name: 'Farthest', distance: 20 },
          ],
          counties: [],
        },
      ],
    })

    expect(normalized.provinces[0].closest_provinces.map((entry) => entry.province_name)).toEqual([
      'Nearest',
      'Nearer',
      'Middle',
      'Far',
      'Farthest',
    ])
  })

  it('builds enriched export data from current template state', () => {
    const output = buildExportTemplate(
      {
        country: { basic_info: { name: 'Test', leader: '' } },
        province_groups: ['Capital Region', 'Frontier'],
        global_religions: ['Zoroastrianism'],
        provinces: [
          {
            name: 'Capital',
            group: 'Capital Region',
            closest_provinces: [
              { province_name: 'Far', distance: 9 },
              { province_name: 'Near', distance: 3 },
            ],
          },
        ],
      },
      [
        {
          provincialPopulation: 1000,
          assemblypeople: 12,
          prelates: 15,
          dominantReligion: 'Zoroastrianism',
        },
      ],
      new Map([
        ['Capital Region', { regionalPopulation: 1000, assemblypeople: 12, prelates: 15 }],
      ])
    )

    expect(output.provinces[0]).toMatchObject({
      provincial_population: 1000,
      assemblypeople: 12,
      prelates: 15,
      dominant_religion: 'Zoroastrianism',
    })
    expect(output.provinces[0].closest_provinces.map((entry) => entry.province_name)).toEqual(['Near', 'Far'])
    expect(output.province_groups).toEqual([
      { name: 'Capital Region', regional_population: 1000, assemblypeople: 12, prelates: 15 },
      { name: 'Frontier', regional_population: null, assemblypeople: null, prelates: null },
    ])
  })
})
