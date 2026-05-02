import { describe, expect, it } from 'vitest'
import { buildProvinceComparisonRows } from '../provinceVisualizations'
import {
  PARTIES,
  allocateCountyPopulations,
  apportionDHondt,
  apportionModifiedSainteLague,
  apportionSainteLague,
  generateRandomTrendPackage,
  matchesSelector,
  scoresToVoteShares,
  simulateElection,
  trendEffect,
} from './index'
import { determineHouseControl } from './coalitions/houseControl'
import { calculateProvincePartyScores } from './scoring/provinceScores'

function sampleTemplate() {
  return {
    country: {
      basic_info: { name: 'Test Empire', leader: 'Leader' },
      state_religion: 'Zoroastrianism',
    },
    province_groups: ['Capital Region', 'Federation of American Provinces'],
    global_religions: ['Zoroastrianism', 'Taoism'],
    provinces: [
      {
        name: 'Capital',
        city_id: 1,
        group: 'Capital Region',
        is_national_capital: true,
        is_regional_capital: true,
        is_founded: true,
        population: 12,
        loyalty: 50,
        growth_percentage: 110,
        happiness_percentage: 115,
        net_amenities: 7,
        yields: { food: 35, production: 40, gold: 80, culture: 55, science: 48, faith: 30 },
        religions: [{ name: 'Zoroastrianism', followers: 10 }, { name: 'Taoism', followers: 1 }],
        counties: [
          {
            name: 'Forum',
            tile_id: 'tile_1',
            distance_from_center: 0,
            terrain: 'Grassland',
            improvement: { name: 'City Center', buildings: { Monument: true }, great_works: { Epic: true } },
            features: {},
            resource: null,
            citizens_working: 3,
            river: true,
            has_railroad: true,
            appeal: 5,
            yields: { food: 5, production: 5, gold: 8, culture: 8, science: 5, faith: 4 },
          },
          {
            name: 'Works',
            tile_id: 'tile_2',
            distance_from_center: 1,
            terrain: 'Plains',
            improvement: { name: 'Industrial Zone', buildings: { Workshop: true, Factory: true }, great_works: {} },
            features: {},
            resource: 'Coal',
            citizens_working: 2,
            river: false,
            has_railroad: true,
            appeal: 1,
            yields: { food: 2, production: 11, gold: 4, culture: 1, science: 2, faith: 0 },
          },
        ],
      },
      {
        name: 'Boston',
        city_id: 2,
        group: 'Federation of American Provinces',
        is_conquered: true,
        population: 8,
        loyalty: 28,
        growth_percentage: 90,
        happiness_percentage: 85,
        net_amenities: 1,
        yields: { food: 24, production: 20, gold: 45, culture: 20, science: 18, faith: 8 },
        religions: [{ name: 'Zoroastrianism', followers: 4 }, { name: 'Taoism', followers: 2 }],
        counties: [
          {
            name: 'Harbor',
            tile_id: 'tile_1',
            distance_from_center: 1,
            terrain: 'Coast',
            improvement: { name: 'Commercial Hub', buildings: { Market: true, Bank: true }, great_works: {} },
            features: {},
            resource: null,
            citizens_working: 2,
            river: true,
            has_railroad: false,
            appeal: 4,
            yields: { food: 3, production: 2, gold: 12, culture: 3, science: 2, faith: 1 },
          },
        ],
      },
    ],
  }
}

function sampleRows(template = sampleTemplate()) {
  const calcs = [
    { provincialPopulation: 1200, assemblypeople: 12, prelates: 6, dominantReligion: 'Zoroastrianism' },
    { provincialPopulation: 800, assemblypeople: 8, prelates: 5, dominantReligion: 'Zoroastrianism' },
  ]
  return buildProvinceComparisonRows(template, calcs)
}

function sum(values) {
  return Object.values(values).reduce((total, value) => total + value, 0)
}

describe('election domain', () => {
  it('apportions seats with deterministic highest-averages helpers', () => {
    const shares = { yellow: 0.4, orange: 0.3, red: 0.15, blue: 0.1, white: 0.03, purple: 0.02 }

    expect(sum(apportionDHondt(shares, 10))).toBe(10)
    expect(sum(apportionSainteLague(shares, 10))).toBe(10)
    expect(sum(apportionModifiedSainteLague(shares, 10))).toBe(10)
    expect(apportionDHondt(shares, 5).yellow).toBeGreaterThanOrEqual(apportionDHondt(shares, 5).orange)
  })

  it('allocates county populations exactly', () => {
    const province = sampleTemplate().provinces[0]
    const counties = allocateCountyPopulations(province, 1001)

    expect(counties.reduce((total, county) => total + county.county_population, 0)).toBe(1001)
    expect(counties.every((county) => county.county_population_share >= 0)).toBe(true)
  })

  it('keeps vote shares normalized and random trends deterministic', () => {
    const shares = scoresToVoteShares({ yellow: 2, orange: 1, red: 1, blue: 1, white: 0.1, purple: 0.1 })
    const trendsA = generateRandomTrendPackage({ seed: 'stable-seed' })
    const trendsB = generateRandomTrendPackage({ seed: 'stable-seed' })

    expect(Math.abs(sum(shares) - 1)).toBeLessThan(0.000001)
    expect(trendsA).toEqual(trendsB)
    expect(trendsA.some((trend) => trend.complexity === 'simple')).toBe(true)
    expect(trendsA.some((trend) => trend.complexity === 'compound' || trend.complexity === 'storyline')).toBe(true)
    expect(trendsA.every((trend) => Array.isArray(trend.effects) && trend.effects.length > 0)).toBe(true)
    expect(trendsA.some((trend) => trend.narrative?.hook)).toBe(true)
  })

  it('matches trend selectors against feature indices', () => {
    expect(matchesSelector(
      { group: 'Federation of American Provinces', political_features: { industrial_index: 0.7 } },
      { groupIncludes: 'American', minIndustrialIndex: 0.6 }
    )).toBe(true)

    expect(matchesSelector(
      {
        name: 'Harbor Ward',
        group: 'Federation of American Provinces',
        terrain: 'Coast',
        political_features: { appeal_index: 0.7 },
      },
      {
        all: [
          { groupIncludes: ['American'] },
          { terrains: ['Coast'] },
          { minFeatures: { feature: 'appeal_index', value: 0.6 } },
        ],
      }
    )).toBe(true)
  })

  it('applies multi-effect trends with weighting, suppression, and interactions', () => {
    const industrialCounty = {
      group: 'Capital Region',
      political_features: { industrial_index: 1, worker_index: 1 },
    }
    const laborTrend = {
      id: 'labor',
      tags: ['labor'],
      effects: [
        {
          level: 'county',
          party: 'orange',
          selector: { minIndustrialIndex: 0.5 },
          magnitude: 0.2,
          weightBy: { feature: 'industrial_index', minMultiplier: 1, maxMultiplier: 2 },
          interactions: [{ withTags: ['grievance'], multiplier: 1.5 }],
        },
      ],
    }
    const grievanceTrend = {
      id: 'grievance',
      tags: ['grievance'],
      effects: [{ level: 'county', party: 'orange', selector: { minIndustrialIndex: 0.5 }, magnitude: 0.1 }],
    }
    const establishmentDrag = {
      id: 'drag',
      effects: [{ level: 'county', party: 'yellow', selector: {}, magnitude: 0.2, mode: 'suppress' }],
    }

    expect(trendEffect(industrialCounty, 'orange', 'county', [laborTrend])).toBeCloseTo(0.4)
    expect(trendEffect(industrialCounty, 'orange', 'county', [laborTrend, grievanceTrend])).toBeCloseTo(0.7)
    expect(trendEffect(industrialCounty, 'yellow', 'county', [establishmentDrag])).toBeCloseTo(-0.2)
  })

  it('simulates provincial, regional, and national chambers from province rows', () => {
    const template = sampleTemplate()
    const result = simulateElection({
      data: template,
      provinceRows: sampleRows(template),
      electionConfig: { seed: 'baseline', jitterSeed: 'baseline', trends: [] },
    })

    expect(result.provinces).toHaveLength(2)
    result.provinces.forEach((province) => {
      expect(sum(province.assembly.seats)).toBe(province.assemblypeople)
      expect(sum(province.prelates.seats)).toBe(province.prelates.seat_count)
      expect(province.counties.reduce((total, county) => total + county.county_population, 0)).toBe(province.provincial_population)
      PARTIES.forEach((party) => {
        expect(province.assembly.vote_shares[party]).toBeGreaterThan(0)
      })
    })

    expect(sum(result.national.assembly.seats)).toBe(20)
    expect(sum(result.national.prelates.seats)).toBe(11)
    expect(result.national.assembly.control.majority).toBe(11)
    expect(['majority', 'minority-government']).toContain(result.national.assembly.control.status)
    expect(Object.keys(result.regions)).toContain('Capital Region')
    expect(result.diagnostics.validation.countyPopulation).toBe(true)
  })

  it('finds minority government control from the largest party and natural partners', () => {
    const control = determineHouseControl({ yellow: 40, red: 18, blue: 15, orange: 14, white: 8, purple: 5 }, [])

    expect(control.status).toBe('minority-government')
    expect(control.leaderParty).toBe('yellow')
    expect(control.seats).toBeGreaterThanOrEqual(control.majority)
    expect(control.supportParties[0]).toBe('red')
  })

  it('keeps Solidarity and Lotus minor outside their natural regions', () => {
    const outsideProvince = {
      is_conquered: false,
      political_features: {
        american_identity_index: 0,
        roman_identity_index: 0,
        taoist_share: 0,
        commerce_index: 0.8,
        localist_index: 0.8,
        spiritual_index: 0.8,
        faith_index: 0.8,
        minority_religion_share: 0.4,
        restorationist_index: 0.3,
      },
    }
    const americanProvince = {
      is_conquered: true,
      political_features: { ...outsideProvince.political_features, american_identity_index: 1 },
    }
    const romanProvince = {
      is_conquered: true,
      political_features: { ...outsideProvince.political_features, roman_identity_index: 1 },
    }

    expect(calculateProvincePartyScores(outsideProvince).white).toBeLessThan(calculateProvincePartyScores(americanProvince).white)
    expect(calculateProvincePartyScores(outsideProvince).purple).toBeLessThan(calculateProvincePartyScores(romanProvince).purple)
    expect(calculateProvincePartyScores(outsideProvince).white).toBeLessThan(0.1)
    expect(calculateProvincePartyScores(outsideProvince).purple).toBeLessThan(0.15)
  })
})
