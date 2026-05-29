/**
 * DEFAULT voter blocs — the data form of the original white/purple "natural"
 * identity branches. Each adds its target party support proportional to bloc
 * membership, per scope.
 *
 * These reproduce the old isAmericanBase / isLotusBase boosts:
 *   - American provincial identity  → white (Solidarity Americana)
 *   - Roman royal restorationism    → purple (Lotus Restorationists)
 *   - Taoist religious minority     → purple
 *
 * Strengths are tuned so the bundled jayavarman example reproduces the original
 * engine within tolerance (see scoringEquivalence.test.js).
 */

const AMERICAN_SELECTOR = {
  any: [
    { groupIncludes: ['American'] },
    { originalCountryIncludes: ['American', 'United States'] },
  ],
}

const ROMAN_SELECTOR = {
  any: [
    { groupIncludes: ['Roman'] },
    { originalCountryIncludes: ['Roman'] },
  ],
}

export const DEFAULT_VOTER_BLOCS = [
  {
    id: 'american_identity',
    label: 'American provincial identity',
    party: 'white',
    source: { selector: AMERICAN_SELECTOR },
    // Province/county strengths express the natural-vs-diaspora *delta* (the
    // boost rides on the diaspora base). National reproduces the old additive
    // national term exactly (0.28).
    strength: { county: 0.22, province: 0.20, national: 0.28 },
  },
  {
    id: 'american_conquered',
    label: 'Conquered American provinces',
    party: 'white',
    source: { selector: { all: [AMERICAN_SELECTOR, { isConquered: true }] } },
    strength: { county: 0.056, province: 0.06, national: 0 },
  },
  {
    id: 'taoist_minority',
    label: 'Taoist religious minority',
    party: 'purple',
    source: { religion: 'Taoism' },
    // Province/county strengths absorb the restorationist amplification the old
    // "natural" branch applied; national reproduces the old additive term (0.22).
    strength: { county: 0.55, province: 0.70, national: 0.22 },
  },
  {
    id: 'roman_restoration',
    label: 'Roman royal restorationism',
    party: 'purple',
    source: { selector: ROMAN_SELECTOR },
    strength: { county: 0.14, province: 0.13, national: 0.1 },
  },
]
