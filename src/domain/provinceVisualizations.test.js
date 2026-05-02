import { describe, expect, it } from 'vitest'
import {
  PROVINCE_VISUALIZATION_MODES,
  buildProvinceComparisonRows,
  buildProvinceVisualizationOption,
} from './provinceVisualizations'

function sampleData() {
  return {
    provinces: [
      {
        name: 'Capital',
        group: 'Core',
        population: '12',
        loyalty: '90',
        growth_percentage: '80',
        happiness_percentage: '70',
        housing: '14',
        net_amenities: '2',
        net_food: '5',
        is_national_capital: true,
        is_regional_capital: true,
        is_founded: true,
        yields: { food: '20', production: '10', gold: '5', culture: '3', science: '7', faith: '4', amenities: '2' },
        religions: [{ name: 'Sun Cult', followers: '9' }],
        counties: [
          {
            terrain: 'Grassland',
            features: { forest: true, marsh: false },
            improvement: { name: 'Farm', buildings: { Granary: true } },
            resource: 'Wheat',
            citizens_working: '2',
            river: true,
            has_railroad: true,
            appeal: '3',
            yields: { food: '4', production: '1', tourism: '2' },
          },
        ],
      },
    ],
  }
}

describe('province visualizations', () => {
  it('builds comparison rows across province and county schema fields', () => {
    const rows = buildProvinceComparisonRows(sampleData(), [
      { provincialPopulation: 1000, assemblypeople: 12, prelates: 15, dominantReligion: 'Sun Cult' },
    ])

    expect(rows[0]).toMatchObject({
      name: 'Capital',
      group: 'Core',
      population: 12,
      provincialPopulation: 1000,
      assemblypeople: 12,
      prelates: 15,
      countyCount: 1,
      citizensWorking: 2,
      riverCount: 1,
      railroadCount: 1,
      averageAppeal: 3,
    })
    expect(rows[0].yields.food).toBe(20)
    expect(rows[0].countyYields.tourism).toBe(2)
    expect(rows[0].terrainCounts.Grassland).toBe(1)
    expect(rows[0].featureCounts.forest).toBe(1)
    expect(rows[0].improvementCounts.Farm).toBe(1)
    expect(rows[0].buildingCounts.Granary).toBe(1)
    expect(rows[0].resourceCounts.Wheat).toBe(1)
  })

  it('creates an option for every visualization mode', () => {
    const rows = buildProvinceComparisonRows(sampleData(), [
      { provincialPopulation: 1000, assemblypeople: 12, prelates: 15, dominantReligion: 'Sun Cult' },
    ])

    PROVINCE_VISUALIZATION_MODES.forEach((mode) => {
      const option = buildProvinceVisualizationOption(mode.id, rows)
      expect(option).toBeTruthy()
      expect(option.series || option.title).toBeTruthy()
    })
  })
})
