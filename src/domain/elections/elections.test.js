import { describe, expect, it } from 'vitest'
import { buildProvinceComparisonRows } from '../provinceVisualizations'
import {
  PARTIES,
  allocateCountyPopulations,
  apportionDHondt,
  apportionModifiedSainteLague,
  apportionSainteLague,
  countyAllowsAmbientPopulation,
  generateRandomTrendPackage,
  generateTrendPackageFromSelections,
  matchesSelector,
  scoresToVoteShares,
  simulateElection,
  trendEffect,
  winnerControlStyle,
} from './index'
import { determineHouseControl } from './coalitions/houseControl'
import { calculateCountyFeatures } from './features/countyFeatures'
import { calculateProvinceBaseFeatures } from './features/provinceFeatures'
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

function expectPartySharesClose(actual, expected, digits = 8) {
  PARTIES.forEach((party) => {
    expect(actual[party]).toBeCloseTo(expected[party], digits)
  })
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

  it('keeps unworked water and mountain tiles from receiving ambient county population', () => {
    const province = {
      counties: [
        {
          name: 'Center',
          tile_id: 'tile_1',
          distance_from_center: 0,
          terrain: 'Plains',
          improvement: { name: 'City Center', buildings: {}, great_works: {} },
          citizens_working: 2,
          river: true,
          has_railroad: true,
          yields: { food: 4, production: 3 },
        },
        {
          name: 'Empty Shore',
          tile_id: 'tile_2',
          distance_from_center: 2,
          terrain: 'Coast',
          improvement: { name: '', buildings: {}, great_works: {} },
          citizens_working: null,
          yields: { food: 2, production: 3, gold: 3 },
        },
        {
          name: 'Unworked Peak',
          tile_id: 'tile_3',
          distance_from_center: 3,
          terrain: 'Grassland (Mountain)',
          improvement: { name: 'National Park', buildings: {}, great_works: {} },
          citizens_working: null,
          yields: {},
        },
        {
          name: 'Working Harbor',
          tile_id: 'tile_4',
          distance_from_center: 2,
          terrain: 'Coast',
          improvement: { name: 'Harbor', buildings: { Lighthouse: true, Shipyard: true, Seaport: true }, great_works: {} },
          citizens_working: 3,
          yields: { food: 6, production: 2, gold: 8 },
        },
      ],
    }
    const counties = allocateCountyPopulations(province, 1000)

    expect(counties.reduce((total, county) => total + county.county_population, 0)).toBe(1000)
    expect(countyAllowsAmbientPopulation(province.counties[1])).toBe(false) // Empty Coast, no improvement, no workers
    expect(countyAllowsAmbientPopulation(province.counties[2])).toBe(true) // Mountain with National Park (has improvement)
    expect(counties.find((county) => county.tile_id === 'tile_2').county_population).toBe(0)
    expect(counties.find((county) => county.tile_id === 'tile_3').county_population).toBeGreaterThan(0)
    expect(counties.find((county) => county.tile_id === 'tile_4').county_population).toBeGreaterThan(0)
  })

  it('derives expanded county indexes from terrain, settlement, and improvement details', () => {
    const provinceContext = {
      imperial_core_index: 0.5,
      minority_religion_share: 0.2,
      state_religion_share: 0.7,
      roman_identity_index: 0,
    }
    const harbor = calculateCountyFeatures({
      terrain: 'Coast',
      improvement: { name: 'Harbor', buildings: { Lighthouse: true, Shipyard: true, Seaport: true }, great_works: {} },
      citizens_working: 3,
      distance_from_center: 2,
      appeal: null,
      features: {},
      yields: { food: 6, production: 2, gold: 8 },
    }, provinceContext)
    const mountainPark = calculateCountyFeatures({
      terrain: 'Tundra (Mountain)',
      improvement: { name: 'National Park', buildings: {}, great_works: {} },
      citizens_working: null,
      distance_from_center: 4,
      appeal: 8,
      features: { Volcano: true },
      yields: {},
    }, provinceContext)
    const quarry = calculateCountyFeatures({
      terrain: 'Grassland',
      resource: 'Marble',
      improvement: { name: 'Quarry', buildings: {}, great_works: {} },
      citizens_working: 1,
      distance_from_center: 3,
      has_railroad: true,
      appeal: 4,
      features: { Marble: true },
      yields: { food: 2, production: 5, culture: 1 },
    }, provinceContext)

    expect(harbor.maritime_index).toBeGreaterThan(0.6)
    expect(harbor.coastal_index).toBeGreaterThan(0.5)
    expect(harbor.terrain_habitation_index).toBe(1)
    expect(mountainPark.mountain_index).toBeGreaterThan(0.6)
    expect(mountainPark.wilderness_index).toBeGreaterThan(0.5)
    expect(mountainPark.terrain_habitation_index).toBe(1)
    expect(quarry.extractive_index).toBeGreaterThan(0.5)
  })

  it('counts listed zero-follower religions as tiny provincial presences', () => {
    const country = { state_religion: 'Zoroastrianism' }
    const province = {
      population: 10,
      loyalty: 50,
      religions: [
        { name: 'Zoroastrianism', followers: '0' },
        { name: 'Taoism', followers: '0' },
        { name: 'Protestantism', followers: '2' },
      ],
      yields: {},
    }
    const features = calculateProvinceBaseFeatures(province, country, { provinceIndex: 1001 })
    const withoutTaoism = calculateProvinceBaseFeatures({
      population: 10,
      loyalty: 50,
      religions: [
        { name: 'Zoroastrianism', followers: '0' },
        { name: 'Protestantism', followers: '2' },
      ],
      yields: {},
    }, country, { provinceIndex: 1002 })

    // Zero-follower listings still register a tiny share (not zero, not clamped at 1).
    expect(features.state_religion_share).toBeGreaterThan(0)
    expect(features.state_religion_share).toBeLessThan(0.05)
    expect(features.taoist_share).toBeGreaterThan(0)
    expect(features.taoist_share).toBeLessThan(0.05)
    // The 2-follower Protestant population dominates: minority share clearly larger
    // than the floor-only state_religion_share.
    expect(features.minority_religion_share).toBeGreaterThan(features.state_religion_share)
    expect(features.minority_religion_share).toBeLessThan(1)
    // Without globalization (no empireReligionTotals) and no listed Taoism,
    // taoist_share is exactly zero.
    expect(withoutTaoism.taoist_share).toBe(0)
    expect(withoutTaoism.minority_religion_share).toBeGreaterThan(0)
  })

  it('scales raw followers and never clamps the share at 1 when followers >= raw population', () => {
    // Mirrors jayavarman.json's Angkor Thom: 28 followers / 30 raw pop. Old
    // behavior would compute 28/30 ≈ 0.93, but any province with followers
    // >= raw pop would clamp to 1. New scaled-space math keeps the share
    // strictly < 1 and meaningfully above 0.5.
    const features = calculateProvinceBaseFeatures({
      population: 30,
      loyalty: 50,
      religions: [{ name: 'Zoroastrianism', followers: '28' }],
      yields: {},
    }, { state_religion: 'Zoroastrianism' }, { provinceIndex: 2001 })
    expect(features.state_religion_share).toBeGreaterThan(0.5)
    expect(features.state_religion_share).toBeLessThan(1)
  })

  it('spreads religions empire-wide via globalization affinity', () => {
    // Province A has 50 Taoists; Province B has none listed. With empire totals
    // passed in, B picks up a small ambient taoist_share via globalization.
    const country = { state_religion: 'Zoroastrianism' }
    const empireReligionTotals = { Taoism: 50_000_000 }
    const noEmpire = calculateProvinceBaseFeatures({
      population: 20,
      loyalty: 50,
      religions: [{ name: 'Zoroastrianism', followers: '5' }],
      yields: { faith: 100 },
      closest_provinces: [{ province_name: 'A', distance: 4 }],
    }, country, { provinceIndex: 3001 })
    const withEmpire = calculateProvinceBaseFeatures({
      population: 20,
      loyalty: 50,
      religions: [{ name: 'Zoroastrianism', followers: '5' }],
      yields: { faith: 100 },
      closest_provinces: [{ province_name: 'A', distance: 4 }],
    }, country, { provinceIndex: 3001, empireReligionTotals })

    expect(noEmpire.taoist_share).toBe(0)
    expect(withEmpire.taoist_share).toBeGreaterThan(0)
  })

  it('derives origin and adjacency features from province metadata', () => {
    const features = calculateProvinceBaseFeatures({
      name: 'Washington',
      group: 'Federation of American Provinces',
      is_conquered: true,
      original_country: 'United States of America',
      population: 10,
      loyalty: 35,
      religions: [],
      yields: {},
      closest_provinces: [
        { province_name: 'Boston', distance: 4 },
        { province_name: 'Philadelphia', distance: 6 },
        { province_name: 'Frontier', distance: 14 },
      ],
    }, { basic_info: { name: 'Khmer Empire' }, state_religion: 'Zoroastrianism' })

    expect(features.foreign_origin_index).toBe(1)
    expect(features.imperial_origin_index).toBe(0)
    expect(features.american_identity_index).toBe(1)
    expect(features.connectedness_index).toBeGreaterThan(features.frontier_index)
    expect(features.nearest_province_distance).toBe(4)
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
        original_country: 'United States of America',
        terrain: 'Coast',
        political_features: { appeal_index: 0.7, foreign_origin_index: 1 },
      },
      {
        all: [
          { groupIncludes: ['American'] },
          { originalCountryIncludes: ['United States'] },
          { minForeignOriginIndex: 0.8 },
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
    const adjacentAutonomy = {
      id: 'adjacent-autonomy',
      effects: [
        {
          level: 'province',
          party: 'blue',
          selector: { originalCountryIncludes: 'United States' },
          magnitude: 0.2,
          adjacency: {
            maxDistance: 10,
            minMultiplier: 0.1,
            maxMultiplier: 0.4,
            sourceSelector: { originalCountryIncludes: 'United States' },
          },
        },
      ],
    }
    const neighboringProvince = {
      name: 'Capital Fringe',
      political_features: {},
      adjacent_provinces: [
        {
          name: 'Boston',
          original_country: 'United States of America',
          distance: 4,
          political_features: { foreign_origin_index: 1 },
        },
      ],
    }

    expect(trendEffect(industrialCounty, 'orange', 'county', [laborTrend])).toBeCloseTo(0.4)
    expect(trendEffect(industrialCounty, 'orange', 'county', [laborTrend, grievanceTrend])).toBeCloseTo(0.7)
    expect(trendEffect(industrialCounty, 'yellow', 'county', [establishmentDrag])).toBeCloseTo(-0.2)
    expect(trendEffect(neighboringProvince, 'blue', 'province', [adjacentAutonomy])).toBeGreaterThan(0)
  })

  it('builds narrative trend packages from selected template ids', () => {
    const packageDef = generateTrendPackageFromSelections({
      seed: 'narrative-test',
      selections: [
        { templateId: 'food-price-crisis', intensity: 0.75, reason: 'cost of living election' },
        { templateId: 'rail-opening', intensity: 0.4, reason: 'incumbent infrastructure counterpoint' },
      ],
      volatility: { national: 0.06, region: 0.1, province: 0.15, county: 0.25 },
    })

    expect(packageDef.trends).toHaveLength(2)
    expect(packageDef.trends[0].effects.length).toBeGreaterThan(1)
    expect(packageDef.trends[0].narrative.reason).toBe('cost of living election')
    expect(packageDef.volatility.county).toBe(0.25)
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

  it('blends province and national assembly votes from local results and climate scores', () => {
    const template = sampleTemplate()
    const result = simulateElection({
      data: template,
      provinceRows: sampleRows(template),
      electionConfig: {
        seed: 'blend-test',
        jitterSeed: 'blend-test',
        trends: [],
        volatility: { national: 0, region: 0, province: 0, county: 0 },
        voteBlend: {
          provincialAssemblyLocalWeight: 0.25,
          nationalAssemblyLocalWeight: 0.4,
        },
      },
    })

    result.provinces.forEach((province) => {
      const expectedProvinceShares = Object.fromEntries(PARTIES.map((party) => [
        party,
        0.25 * province.assembly.local_vote_shares[party] + 0.75 * province.assembly.climate_vote_shares[party],
      ]))

      expectPartySharesClose(province.assembly.vote_shares, expectedProvinceShares)
      expect(province.assembly.vote_blend.local_weight).toBe(0.25)
      expect(province.assembly.vote_blend.climate_weight).toBe(0.75)
    })

    const expectedNationalShares = Object.fromEntries(PARTIES.map((party) => [
      party,
      0.4 * result.national.assembly.local_vote_shares[party] + 0.6 * result.national.assembly.climate_vote_shares[party],
    ]))

    expectPartySharesClose(result.national.assembly.vote_shares, expectedNationalShares)
    expect(result.national.assembly.vote_blend.local_weight).toBe(0.4)
    expect(result.national.assembly.vote_blend.climate_weight).toBe(0.6)
  })

  it('finds minority government control from the largest party and natural partners', () => {
    const control = determineHouseControl({ yellow: 40, red: 18, blue: 15, orange: 14, white: 8, purple: 5 }, [])

    expect(control.status).toBe('minority-government')
    expect(control.leaderParty).toBe('yellow')
    expect(control.seats).toBeGreaterThanOrEqual(control.majority)
    // Yellow now prioritizes orange as partner after being weakened
    expect(control.supportParties[0]).toBe('orange')
  })

  it('mutes minority government control styling while preserving majority color', () => {
    const partyMeta = { yellow: { color: '#d4a843' } }
    const majorityStyle = winnerControlStyle({ status: 'majority', leaderParty: 'yellow' }, partyMeta)
    const minorityStyle = winnerControlStyle({ status: 'minority-government', leaderParty: 'yellow' }, partyMeta)

    expect(majorityStyle['--winner-color']).toBe('#d4a843')
    expect(minorityStyle['--winner-color']).toBe('color-mix(in srgb, #d4a843 64%, var(--text-muted))')
    expect(minorityStyle['--winner-bg']).toBe('#d4a84312')
    expect(minorityStyle['--winner-border']).toBe('#d4a84344')
  })

  it('uses FPTP county council for provinces with more than 20 counties', () => {
    const countyBase = {
      distance_from_center: 1,
      terrain: 'Grassland',
      improvement: { name: 'Farm', buildings: {}, great_works: {} },
      features: {},
      resource: null,
      citizens_working: 1,
      river: false,
      has_railroad: false,
      appeal: 3,
      yields: { food: 3, production: 2, gold: 1, culture: 1, science: 1, faith: 0 },
    }
    const counties = Array.from({ length: 21 }, (_, i) => ({
      ...countyBase,
      name: `County ${i + 1}`,
      tile_id: `tile_${i + 1}`,
      distance_from_center: i === 0 ? 0 : 2,
      improvement: i === 0
        ? { name: 'City Center', buildings: {}, great_works: {} }
        : countyBase.improvement,
    }))
    const template = {
      country: {
        basic_info: { name: 'Test Empire', leader: 'Leader' },
        state_religion: 'Zoroastrianism',
      },
      province_groups: ['Capital Region'],
      global_religions: ['Zoroastrianism'],
      provinces: [
        {
          name: 'LargeProvince',
          city_id: 10,
          group: 'Capital Region',
          is_national_capital: false,
          population: 21,
          loyalty: 50,
          growth_percentage: 100,
          happiness_percentage: 100,
          net_amenities: 5,
          yields: { food: 30, production: 30, gold: 30, culture: 30, science: 30, faith: 10 },
          religions: [{ name: 'Zoroastrianism', followers: 20 }],
          counties,
        },
      ],
    }
    const rows = buildProvinceComparisonRows(template, [
      { provincialPopulation: 2100, assemblypeople: 10, prelates: 7, dominantReligion: 'Zoroastrianism' },
    ])
    const result = simulateElection({
      data: template,
      provinceRows: rows,
      electionConfig: { seed: 'fptp-test', jitterSeed: 'fptp-test', trends: [] },
    })

    const province = result.provinces[0]
    expect(province.counties.length).toBe(21)
    expect(province.prelates.seat_count).toBe(21)
    expect(sum(province.prelates.seats)).toBe(21)
    expect(sum(province.assembly.seats)).toBe(province.assemblypeople)
    expect(result.diagnostics.validation.seatCounts).toBe(true)
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
