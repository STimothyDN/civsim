import { COUNTY_SCALE } from '../features/featureCatalog'

/**
 * DEFAULT party configuration. Each party carries, per scope (county /
 * province / national):
 *   - bias[scope]:   the constant base term
 *   - affinities[scope][featureKey]: linear weight on that feature
 *
 * score(party, unit) = bias[scope] + Σ affinities[scope][feat] * featureValue[feat]
 *                      + Σ voter-bloc contributions (see defaultVoterBlocs.js)
 *
 * Feature keys are the model's features (features/featureCatalog.js), which
 * exist under the same key at every scope, so each party is written as one map
 * (its county weights), scaled by COUNTY_SCALE for province/national scope so
 * it pulls as hard there as on a county. Weights follow each party's ideology. Biases are calibrated so the
 * four major parties start level on the bundled Khmer example (county features
 * run sparser than province ones, hence the larger county biases) and the
 * minors well below them; white and purple draw most of their support from
 * voter blocs. World-specific balancing is the player's (Advanced Setup) or the
 * generators'.
 */

function provinceWeights(affinities) {
  return Object.fromEntries(Object.entries(affinities).map(([key, weight]) => (
    [key, Math.round(weight * (COUNTY_SCALE[key] ?? 1) * 1000) / 1000]
  )))
}

const everyScope = (affinities) => ({ county: { ...affinities }, province: provinceWeights(affinities), national: provinceWeights(affinities) })

export const DEFAULT_PARTIES = [
  {
    id: 'yellow',
    name: 'Divinus Sol',
    abbreviation: 'DS',
    colorName: 'Yellow',
    color: '#d4a843',
    tier: 'major',
    ideology: 'Imperial centralist, enlightened elite, state-development party',
    coalitionPartners: ['orange', 'red', 'blue', 'purple', 'white'],
    bias: { county: 0.052, province: 0.05, national: 0.022 },
    affinities: everyScope({
      civic_monument_index: 0.35,
      imperial_core_index: 0.32,
      cultural_elite_index: 0.22,
      development_index: 0.14,
      state_religion_share: 0.08,
      loyalty_index: 0.08,
      intellectual_index: 0.1,
      infrastructure_index: 0.1,
      urban_index: 0.05,
      localist_index: -0.03,
      conquered_index: -0.03,
      foreign_origin_index: -0.02,
    }),
  },
  {
    id: 'orange',
    name: 'United Workers Congress',
    abbreviation: 'UWC',
    colorName: 'Orange',
    color: '#fb923c',
    tier: 'major',
    ideology: 'Labor, industrial workers, organized production, urban economic justice',
    coalitionPartners: ['blue', 'yellow', 'red', 'white', 'purple'],
    bias: { county: 0.093, province: 0.088, national: 0.22 },
    affinities: everyScope({
      worker_index: 0.6,
      industrial_index: 0.5,
      worker_grievance_index: 0.5,
      urban_index: 0.35,
      production_index: 0.2,
      maritime_index: 0.2,
      extractive_index: 0.2,
      imperial_core_index: -0.04,
      spiritual_index: -0.04,
    }),
  },
  {
    id: 'red',
    name: 'The National Drumbeat',
    abbreviation: 'ND',
    colorName: 'Red',
    color: '#ef4444',
    tier: 'major',
    ideology: 'Rural, military, socially conservative, patriotic traditionalist',
    coalitionPartners: ['purple', 'yellow', 'orange', 'white', 'blue'],
    bias: { county: 0.223, province: 0.244, national: 0.094 },
    affinities: everyScope({
      agrarian_index: 0.35,
      military_index: 0.35,
      rural_index: 0.3,
      traditionalist_index: 0.1,
      frontier_index: 0.08,
      state_religion_share: 0.03,
      mountain_index: 0.06,
      hardship_index: 0.06,
      urban_index: -0.12,
      intellectual_index: -0.06,
      foreign_origin_index: -0.05,
    }),
  },
  {
    id: 'blue',
    name: 'Coalition of the Free',
    abbreviation: 'CF',
    colorName: 'Blue',
    color: '#60a5fa',
    tier: 'major',
    ideology: 'Civic middle class, intellectuals, spiritual reformers, decentralists',
    coalitionPartners: ['orange', 'purple', 'yellow', 'white', 'red'],
    bias: { county: 0.105, province: 0.117, national: 0.158 },
    affinities: everyScope({
      middle_class_index: 0.55,
      intellectual_index: 0.4,
      commercial_index: 0.35,
      spiritual_index: 0.15,
      minority_religion_share: 0.15,
      localist_index: 0.12,
      cultural_elite_index: 0.12,
      appeal_index: 0.12,
      urban_index: 0.1,
      imperial_core_index: -0.04,
    }),
  },
  {
    id: 'white',
    name: 'Solidarity Americana',
    abbreviation: 'SA',
    colorName: 'White',
    color: '#f8fafc',
    tier: 'minor',
    ideology: 'American provincial interest, autonomy bloc, regional-interest party',
    coalitionPartners: ['blue', 'orange', 'red', 'purple', 'yellow'],
    // Most support comes from the American identity voter blocs.
    bias: { county: 0.02, province: 0.02, national: 0.02 },
    affinities: everyScope({
      localist_index: 0.1,
      foreign_origin_index: 0.06,
      commercial_index: 0.05,
      frontier_index: 0.04,
      urban_index: 0.03,
    }),
  },
  {
    id: 'purple',
    name: 'Lotus Restorationists',
    abbreviation: 'LR',
    colorName: 'Purple',
    color: '#a78bfa',
    tier: 'minor',
    ideology: 'Taoist interest, religious-cultural minority, Roman royal restorationism',
    coalitionPartners: ['red', 'blue', 'yellow', 'white', 'orange'],
    // Most support comes from the Taoist and Roman voter blocs.
    bias: { county: 0.036, province: 0.081, national: 0.144 },
    affinities: everyScope({
      restorationist_index: 0.15,
      minority_religion_share: 0.12,
      spiritual_index: 0.08,
      heritage_index: 0.08,
      faith_index: 0.04,
    }),
  },
  {
    id: 'green',
    name: 'Green Party',
    abbreviation: 'GP',
    colorName: 'Green',
    color: '#22c55e',
    tier: 'minor',
    ideology: 'Environmental conservation, natural preservation, ecological sustainability',
    coalitionPartners: ['blue', 'orange', 'purple', 'red', 'yellow'],
    bias: { county: 0.147, province: 0.18, national: 0.128 },
    affinities: everyScope({
      ecology_index: 0.35,
      wilderness_index: 0.15,
      appeal_index: 0.15,
      leisure_tourism_index: 0.1,
      coastal_index: 0.06,
      mountain_index: 0.05,
      watershed_index: 0.05,
      pollution_index: -0.2,
      industrial_index: -0.06,
      urban_index: -0.05,
    }),
  },
]
