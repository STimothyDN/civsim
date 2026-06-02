import { describe, expect, it } from 'vitest'
import { generateRepresentativeNames, DEFAULT_NAMING } from './representativeNames'

function seats(party, n, startIndex = 0) {
  return Array.from({ length: n }, (_, i) => ({
    party,
    seatIndex: startIndex + i,
    withinPartyIndex: i,
    jurisdiction: 'Somewhere',
  }))
}

describe('config-driven representative naming', () => {
  it('uses only the configured home culture when no other cultures apply', () => {
    const naming = {
      homeCulture: { id: 'home', label: 'Test', givenMale: ['Aaa'], givenFemale: ['Aae'], surnames: ['Bbb'] },
      cultures: [],
    }
    const names = generateRepresentativeNames(seats('blue', 5), [], 'seed-1', naming)
    Object.values(names).forEach((name) => {
      expect(['Aaa Bbb', 'Aae Bbb']).toContain(name)
    })
  })

  it('applies a party-tied culture only to that party, never leaking to others', () => {
    const naming = {
      homeCulture: { id: 'home', label: 'Home', givenMale: ['Aaa'], givenFemale: ['Aae'], surnames: ['Bbb'] },
      cultures: [
        {
          id: 'tied', label: 'Tied', givenMale: ['Ccc'], givenFemale: ['Cce'], surnames: ['Ddd'],
          selector: null, parties: ['red'], influence: 0, ambient: 0, surnameBlend: 0,
        },
      ],
    }
    const blue = generateRepresentativeNames(seats('blue', 6), [], 'seed-2', naming)
    const red = generateRepresentativeNames(seats('red', 30), [], 'seed-2', naming)

    // Blue never sees the tied culture (no selector, no ambient, not party-tied).
    Object.values(blue).forEach((name) => expect(['Aaa Bbb', 'Aae Bbb']).toContain(name))
    // Red can use either home or the tied culture, and across many seats does use it.
    const redNames = Object.values(red)
    redNames.forEach((name) => expect(['Aaa Bbb', 'Aae Bbb', 'Ccc Ddd', 'Cce Ddd']).toContain(name))
    expect(redNames.some((n) => n.endsWith('Ddd'))).toBe(true)
  })

  it('matches a culture by province origin country', () => {
    const naming = {
      homeCulture: { id: 'home', label: 'Home', givenMale: ['Aaa'], givenFemale: ['Aae'], surnames: ['Bbb'] },
      cultures: [
        {
          id: 'foreign', label: 'Foreign', givenMale: ['Xxx'], givenFemale: ['Xxe'], surnames: ['Yyy'],
          selector: { originalCountryIncludes: ['Atlantis'] }, parties: [], influence: 5, ambient: 0, surnameBlend: 0,
        },
      ],
    }
    const provinces = [{ name: 'Pearl', original_country: 'Atlantis', political_features: {} }]
    const names = generateRepresentativeNames(
      [{ party: 'blue', seatIndex: 0, withinPartyIndex: 0, jurisdiction: 'Pearl' }],
      provinces, 'seed-3', naming
    )
    // High influence in a matching province → foreign culture dominates.
    expect(Object.values(names)[0]).toBe('Xxx Yyy')
  })

  it('draws a voter-bloc-linked culture only in provinces where the bloc is present (province-aware)', () => {
    const naming = {
      homeCulture: { id: 'home', label: 'Home', givenMale: ['Aaa'], givenFemale: ['Aae'], surnames: ['Bbb'] },
      cultures: [
        {
          id: 'roman', label: 'Roman', givenMale: ['Marcus'], givenFemale: ['Julia'], surnames: ['Cato'],
          selector: null, parties: [], influence: 0, ambient: 0, surnameBlend: 0,
        },
      ],
    }
    // Roman bloc backs purple and names the Roman culture, present only in Roman-group provinces.
    const blocs = [{
      id: 'roman_restoration', party: 'purple', cultureId: 'roman',
      source: { selector: { groupIncludes: ['Roman'] } }, strength: { province: 0.1 },
    }]
    const provinces = [
      { name: 'RomeProv', group: 'Roman', political_features: {} },
      { name: 'KhmerProv', group: 'Khmer', political_features: {} },
    ]
    const purpleSeats = (jurisdiction) => Array.from({ length: 8 }, (_, i) => ({
      party: 'purple', seatIndex: i, withinPartyIndex: i, jurisdiction,
    }))

    const romanProvinceNames = generateRepresentativeNames(purpleSeats('RomeProv'), provinces, 'seed-bloc', naming, blocs)
    const khmerProvinceNames = generateRepresentativeNames(purpleSeats('KhmerProv'), provinces, 'seed-bloc', naming, blocs)

    // Where the bloc is present, Roman names appear.
    expect(Object.values(romanProvinceNames).some((n) => n.endsWith('Cato'))).toBe(true)
    // Where the bloc is absent, only home names — no leakage.
    Object.values(khmerProvinceNames).forEach((n) => expect(['Aaa Bbb', 'Aae Bbb']).toContain(n))
  })

  it('does not draw a bloc-linked culture for parties the bloc does not back', () => {
    const naming = {
      homeCulture: { id: 'home', label: 'Home', givenMale: ['Aaa'], givenFemale: ['Aae'], surnames: ['Bbb'] },
      cultures: [
        {
          id: 'roman', label: 'Roman', givenMale: ['Marcus'], givenFemale: ['Julia'], surnames: ['Cato'],
          selector: null, parties: [], influence: 0, ambient: 0, surnameBlend: 0,
        },
      ],
    }
    const blocs = [{ id: 'roman_restoration', party: 'purple', cultureId: 'roman', source: { selector: { groupIncludes: ['Roman'] } } }]
    const provinces = [{ name: 'RomeProv', group: 'Roman', political_features: {} }]
    // Yellow is not backed by the bloc → stays home even in the Roman province.
    const yellowSeats = Array.from({ length: 8 }, (_, i) => ({ party: 'yellow', seatIndex: i, withinPartyIndex: i, jurisdiction: 'RomeProv' }))
    const names = generateRepresentativeNames(yellowSeats, provinces, 'seed-bloc', naming, blocs)
    Object.values(names).forEach((n) => expect(['Aaa Bbb', 'Aae Bbb']).toContain(n))
  })

  it('ships a default naming config with a home culture and cultures', () => {
    expect(DEFAULT_NAMING.homeCulture.givenMale.length).toBeGreaterThan(0)
    expect(DEFAULT_NAMING.cultures.length).toBeGreaterThan(0)
  })
})
