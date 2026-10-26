/**
 * DEFAULT voter blocs: identity groups that lean toward a party regardless of
 * the economic and social make-up of where they live. Each adds its party
 * support proportional to bloc membership, per scope:
 *   - American provincial identity  → white (Solidarity Americana)
 *   - Roman royal restorationism    → purple (Lotus Restorationists)
 *   - Taoist religious minority     → purple, graded by the province's Taoist
 *     share (province political_features.religion_shares)
 */

const AMERICAN_SELECTOR = {
  any: [
    { groupIncludes: ['America'] },
    { originalCountryIncludes: ['America', 'United States'] },
  ],
}

const ROMAN_SELECTOR = {
  any: [
    { groupIncludes: ['Rome', 'Roman', 'Romaioi'] },
    { originalCountryIncludes: ['Rome', 'Roman', 'Romaioi'] },
  ],
}

export const DEFAULT_VOTER_BLOCS = [
  {
    id: 'american_identity',
    label: 'American provincial identity',
    party: 'white',
    cultureId: 'american',
    source: { selector: AMERICAN_SELECTOR },
    strength: { county: 0.22, province: 0.2, national: 0.2 },
  },
  {
    id: 'american_conquered',
    label: 'Conquered American provinces',
    party: 'white',
    cultureId: 'american',
    source: { selector: { all: [AMERICAN_SELECTOR, { isConquered: true }] } },
    strength: { county: 0.05, province: 0.05, national: 0 },
  },
  {
    id: 'taoist_minority',
    label: 'Taoist religious minority',
    party: 'purple',
    source: { religion: 'Taoism' },
    strength: { county: 0.55, province: 0.70, national: 0.22 },
  },
  {
    id: 'roman_restoration',
    label: 'Roman royal restorationism',
    party: 'purple',
    cultureId: 'roman',
    source: { selector: ROMAN_SELECTOR },
    strength: { county: 0.2, province: 0.18, national: 0.15 },
  },
]
