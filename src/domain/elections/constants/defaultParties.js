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
 * exist under the same key at every scope, so each party uses one map
 * everywhere. Weights follow each party's ideology. Biases are calibrated so the
 * four major parties start level on the bundled Khmer example (county features
 * run sparser than province ones, hence the larger county biases) and the
 * minors well below them; white and purple draw most of their support from
 * voter blocs. World-specific balancing is the player's (Advanced Setup) or the
 * generators'.
 */

const everyScope = (affinities) => ({ county: { ...affinities }, province: { ...affinities }, national: { ...affinities } })

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
    bias: { county: 0.13, province: 0.01, national: 0.01 },
    affinities: everyScope({
      imperial_core_index: 0.22,
      civic_monument_index: 0.14,
      cultural_elite_index: 0.12,
      intellectual_index: 0.1,
      development_index: 0.1,
      state_religion_share: 0.08,
      infrastructure_index: 0.08,
      loyalty_index: 0.06,
      urban_index: 0.05,
      conquered_index: -0.18,
      localist_index: -0.12,
      foreign_origin_index: -0.08,
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
    bias: { county: 0.235, province: 0.11, national: 0.11 },
    affinities: everyScope({
      worker_index: 0.26,
      industrial_index: 0.24,
      worker_grievance_index: 0.2,
      urban_index: 0.12,
      extractive_index: 0.1,
      production_index: 0.08,
      maritime_index: 0.06,
      imperial_core_index: -0.06,
      spiritual_index: -0.06,
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
    bias: { county: 0.1, province: 0.045, national: 0.045 },
    affinities: everyScope({
      agrarian_index: 0.22,
      rural_index: 0.2,
      military_index: 0.18,
      traditionalist_index: 0.18,
      state_religion_share: 0.06,
      frontier_index: 0.06,
      mountain_index: 0.05,
      hardship_index: 0.04,
      urban_index: -0.1,
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
    bias: { county: 0.205, province: 0.005, national: 0.005 },
    affinities: everyScope({
      middle_class_index: 0.2,
      intellectual_index: 0.18,
      spiritual_index: 0.12,
      commercial_index: 0.1,
      localist_index: 0.1,
      minority_religion_share: 0.08,
      cultural_elite_index: 0.06,
      appeal_index: 0.06,
      economic_diversity_index: 0.05,
      imperial_core_index: -0.06,
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
    bias: { county: 0.015, province: 0.005, national: 0.005 },
    affinities: everyScope({
      localist_index: 0.06,
      foreign_origin_index: 0.04,
      commercial_index: 0.03,
      frontier_index: 0.03,
      urban_index: 0.02,
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
    bias: { county: 0.04, province: 0.005, national: 0.005 },
    affinities: everyScope({
      restorationist_index: 0.08,
      minority_religion_share: 0.06,
      spiritual_index: 0.05,
      heritage_index: 0.05,
      faith_index: 0.03,
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
    bias: { county: 0.09, province: 0.065, national: 0.065 },
    affinities: everyScope({
      ecology_index: 0.2,
      wilderness_index: 0.1,
      appeal_index: 0.1,
      leisure_tourism_index: 0.06,
      coastal_index: 0.05,
      mountain_index: 0.04,
      pollution_index: -0.15,
      industrial_index: -0.06,
      urban_index: -0.04,
    }),
  },
]
