/**
 * The political model's feature set: every index a party can weight. Values are
 * 0..1. Every feature exists at every scope under the same key:
 *   county   — computed from the county (src/domain/civ6 profiles + context);
 *              identity features are inherited from its province
 *   province — population-weighted county values, province-native identity,
 *              and yield fallbacks where county detail is missing
 *   national — population-weighted province values
 * See src/domain/elections/MODEL.md for how each one is built.
 */

const FEATURES = [
  // What the economy runs on.
  ['urban_index', 'Urban density', 'Economy', 'City centers, districts and built-up land near the core.'],
  ['rural_index', 'Countryside', 'Economy', 'Farms, camps and open land far from the city.'],
  ['agrarian_index', 'Farming & herding', 'Economy', 'Farms, plantations, pastures, fertile land and food yield.'],
  ['industrial_index', 'Industry & energy', 'Economy', 'Industrial zones, factories, power plants and energy improvements.'],
  ['extractive_index', 'Extraction', 'Economy', 'Mines, quarries, camps, lumber, oil and mineral resources.'],
  ['commercial_index', 'Commerce & finance', 'Economy', 'Commercial hubs, markets, banks, luxury trade and gold yield.'],
  ['maritime_index', 'Seafaring', 'Economy', 'Harbors, fishing, sea resources, shipyards and navies.'],
  ['worker_index', 'Working class', 'Economy', 'Manual labor: factories, mines, docks, plantations and production yield.'],
  ['development_index', 'Development', 'Economy', 'How built up and modernized: improvements, buildings, railroads, services.'],
  ['economic_diversity_index', 'Economic diversity', 'Economy', 'How evenly yields are spread across food, production, gold, culture, science and faith.'],

  // Raw game yields.
  ['food_index', 'Food yield', 'Yields', 'Food per tile (county) or per citizen (province).'],
  ['production_index', 'Production yield', 'Yields', 'Production per tile or per citizen.'],
  ['gold_index', 'Gold yield', 'Yields', 'Gold per tile or per citizen.'],
  ['culture_index', 'Culture yield', 'Yields', 'Culture per tile or per citizen.'],
  ['science_index', 'Science yield', 'Yields', 'Science per tile or per citizen.'],
  ['faith_index', 'Faith yield', 'Yields', 'Faith per tile or per citizen.'],

  // Institutions and social make-up.
  ['military_index', 'Military presence', 'Society', 'Encampments, walls, forts, military buildings and strategic resources.'],
  ['intellectual_index', 'Academia & science', 'Society', 'Campuses, libraries, universities, science wonders and science yield.'],
  ['spiritual_index', 'Religious life', 'Society', 'Holy sites, temples, worship buildings, sacred sites and faith yield.'],
  ['cultural_elite_index', 'Arts & high culture', 'Society', 'Theater squares, museums, great works, cultural wonders and culture yield.'],
  ['civic_monument_index', 'State institutions', 'Society', 'Palaces, government plazas, monuments and wonders of state.'],
  ['middle_class_index', 'Middle class', 'Society', 'Neighborhoods, shops, markets, universities and pleasant urban living.'],
  ['leisure_tourism_index', 'Leisure & tourism', 'Society', 'Entertainment, parks, resorts, wonders and scenic appeal.'],
  ['heritage_index', 'Historic heritage', 'Society', 'Antiquity sites, ancient wonders, archaeology and historic monuments.'],

  // Political temperaments built from the above plus province identity.
  ['traditionalist_index', 'Traditionalism', 'Attitudes', 'Rural, agrarian, military and state-religion conservatism.'],
  ['localist_index', 'Localism / autonomy', 'Attitudes', 'Distance from the core, foreign origin, conquest and minority faith.'],
  ['restorationist_index', 'Restorationism', 'Attitudes', 'Conquered or annexed lands with heritage and a faith of their own.'],
  ['worker_grievance_index', 'Labor grievance', 'Attitudes', 'Working-class, urban and polluted areas weighed by unhappiness.'],

  // Province identity; counties inherit their province's value.
  ['imperial_core_index', 'Imperial core', 'Identity & loyalty', 'Capitals, founded cities, loyalty and ties to the state religion and home continent.'],
  ['loyalty_index', 'Loyalty', 'Identity & loyalty', 'City loyalty.'],
  ['happiness_index', 'Happiness', 'Identity & loyalty', 'Happiness and net amenities.'],
  ['state_religion_share', 'State religion share', 'Identity & loyalty', 'Share following the state religion.'],
  ['minority_religion_share', 'Minority religion share', 'Identity & loyalty', 'Share following other religions.'],
  ['religious_homogeneity_index', 'Religious homogeneity', 'Identity & loyalty', 'How concentrated faith is in one religion.'],
  ['foreign_origin_index', 'Foreign origin', 'Identity & loyalty', 'Joined or conquered from another civilization.'],
  ['same_continent_index', 'Home continent', 'Identity & loyalty', 'On the same continent as the national capital.'],
  ['conquered_index', 'Conquered', 'Identity & loyalty', 'Taken by conquest.'],

  // The land itself.
  ['coastal_index', 'Coastal', 'Geography', 'Coast, lake and ocean shores.'],
  ['mountain_index', 'Highlands', 'Geography', 'Hills and mountains.'],
  ['wilderness_index', 'Wilderness', 'Geography', 'Untamed, remote land: woods, rainforest, marsh, mountains.'],
  ['ecology_index', 'Ecology', 'Geography', 'Sensitive habitats: rainforest, old-growth woods, reefs, marsh, natural wonders, preserves.'],
  ['hardship_index', 'Harsh land', 'Geography', 'Desert, tundra, snow, ice and blighted land.'],
  ['watershed_index', 'River valley', 'Geography', 'Rivers, lakes, oases and floodplains.'],
  ['appeal_index', 'Tile appeal', 'Geography', 'Civ 6 tile appeal.'],
  ['infrastructure_index', 'Infrastructure', 'Geography', 'Railroads, aqueducts, dams, canals, tunnels and bridges.'],
  ['frontier_index', 'Frontier', 'Geography', 'Far from neighboring provinces.'],
  ['pollution_index', 'Pollution', 'Geography', 'Factories, power plants, mines, oil and fallout, less clean energy and preserves.'],
]

const SCOPES = ['county', 'province', 'national']

export const FEATURE_CATALOG = FEATURES.map(([key, label, group, description]) => ({
  key,
  label,
  group,
  description,
  scopes: SCOPES,
}))

export const FEATURE_KEYS = FEATURE_CATALOG.map((entry) => entry.key)

export const FEATURE_GROUPS = ['Economy', 'Yields', 'Society', 'Attitudes', 'Identity & loyalty', 'Geography']

// Identity features a county inherits from its province when scored.
export const PROVINCE_IDENTITY_FEATURES = [
  'imperial_core_index',
  'loyalty_index',
  'happiness_index',
  'state_religion_share',
  'minority_religion_share',
  'religious_homogeneity_index',
  'foreign_origin_index',
  'same_continent_index',
  'conquered_index',
  'frontier_index',
]

/**
 * Typical county reading as a share of the province reading, per feature,
 * weighting counties by population (so 1 for every economy and class feature,
 * which provinces read population-weighted). Other features differ by
 * construction: a province *has* academia or a navy when one of its counties is
 * a Campus or Harbor (presence), its yields are per citizen rather than per
 * tile, and its land is read by area while people cluster on rivers and rails
 * and away from coasts and wilds.
 * Used to read a blank county as its province's average voter, and to carry a
 * party's county weights to province scope so they pull equally hard there.
 * Measured on the fully described provinces of the bundled Khmer world.
 */
export const COUNTY_SCALE = {
  maritime_index: 0.1,
  intellectual_index: 0.1,
  spiritual_index: 0.15,
  heritage_index: 0.15,
  military_index: 0.2,
  cultural_elite_index: 0.25,
  leisure_tourism_index: 0.3,
  civic_monument_index: 0.4,
  restorationist_index: 0.7,
  culture_index: 0.1,
  science_index: 0.1,
  faith_index: 0.2,
  gold_index: 0.3,
  production_index: 0.35,
  food_index: 0.6,
  coastal_index: 0.2,
  wilderness_index: 0.3,
  ecology_index: 0.3,
  mountain_index: 0.7,
  hardship_index: 0.85,
  watershed_index: 1.5,
  pollution_index: 1.8,
  infrastructure_index: 2,
}

const CATALOG_BY_KEY = new Map(FEATURE_CATALOG.map((entry) => [entry.key, entry]))

/** Features available at a given scope, in catalog order. */
export function featuresForScope(scope) {
  return FEATURE_CATALOG.filter((entry) => entry.scopes.includes(scope))
}

/**
 * Keys from earlier versions of the model and what they became. A weight w on
 * an old key becomes Σ w·factor on the listed keys, plus w·offset on the
 * party's bias — exact for complements (imperial_origin = 1 − foreign_origin).
 * Keys with no `to` are dropped (their job moved to voter blocs).
 */
export const LEGACY_FEATURE_MAP = {
  urbanization_index: { to: [['urban_index', 1]] },
  commerce_index: { to: [['commercial_index', 1]] },
  religious_minority_index: { to: [['minority_religion_share', 1]] },
  imperial_origin_index: { to: [['foreign_origin_index', -1]], offset: 1 },
  cross_continental_index: { to: [['same_continent_index', -1]], offset: 1 },
  connectedness_index: { to: [['frontier_index', -1]], offset: 1 },
  isolation_index: { to: [['frontier_index', 1]] },
  amenity_index: { to: [['happiness_index', 1]] },
  growth_index: { to: [['food_index', 0.5], ['happiness_index', 0.5]] },
  provincial_power_index: { to: [['production_index', 0.5], ['gold_index', 0.5]] },
  improved_status_index: { to: [['development_index', 1]] },
  yield_diversity_index: { to: [['economic_diversity_index', 1]] },
  mine_or_corporation_index: { to: [['extractive_index', 0.6], ['commercial_index', 0.4]] },
  neighborhood_index: { to: [['middle_class_index', 1]] },
  residential_index: { to: [['middle_class_index', 1]] },
  commercial_middle_class_index: { to: [['middle_class_index', 1]] },
  cultural_output_index: { to: [['cultural_elite_index', 1]] },
  rainforest_index: { to: [['ecology_index', 1]] },
  protected_marine_index: { to: [['ecology_index', 1]] },
  offshore_development_index: { to: [['maritime_index', 1]] },
  terrain_habitation_index: { to: [['hardship_index', -1]], offset: 1 },
  inverse_science_culture_index: { to: [['science_index', -0.5], ['culture_index', -0.5]], offset: 1 },
  desert_region_index: { to: [['hardship_index', 1]] },
  floodplain_index: { to: [['watershed_index', 1]] },
  maritime_basin_index: { to: [['coastal_index', 1]] },
  luxury_resource_index: { to: [['commercial_index', 1]] },
  energy_resource_index: { to: [['industrial_index', 1]] },
  resource_cluster_index: { to: [['extractive_index', 1]] },
  resource_development_index: { to: [['extractive_index', 1]] },
  taoist_share: {},
  american_identity_index: {},
  roman_identity_index: {},
}

// Migrated weights stay inside the range the editor and generators allow.
const MIGRATED_WEIGHT_LIMIT = 0.45

/**
 * Rewrite one scope's affinity map onto current keys.
 * @returns {{ affinities: Record<string, number>, biasDelta: number }}
 */
export function migrateAffinityMap(affinities = {}) {
  const out = {}
  let biasDelta = 0
  for (const [key, rawWeight] of Object.entries(affinities || {})) {
    const weight = Number(rawWeight)
    if (!Number.isFinite(weight) || weight === 0) continue
    if (CATALOG_BY_KEY.has(key)) {
      out[key] = (out[key] || 0) + weight
      continue
    }
    const legacy = LEGACY_FEATURE_MAP[key]
    if (!legacy) continue
    for (const [target, factor] of legacy.to || []) out[target] = (out[target] || 0) + weight * factor
    if (legacy.offset) biasDelta += weight * legacy.offset
  }
  for (const key of Object.keys(out)) {
    out[key] = Math.round(Math.max(-MIGRATED_WEIGHT_LIMIT, Math.min(MIGRATED_WEIGHT_LIMIT, out[key])) * 1e4) / 1e4
    if (!out[key]) delete out[key]
  }
  return { affinities: out, biasDelta: Math.round(biasDelta * 1e4) / 1e4 }
}

/** Whether a map uses any key the current model no longer has. */
export function hasLegacyFeatureKeys(affinities = {}) {
  return Object.keys(affinities || {}).some((key) => !CATALOG_BY_KEY.has(key) && key in LEGACY_FEATURE_MAP)
}

/**
 * Read a feature from a feature vector, translating old keys (saved trends,
 * voter blocs, LLM output) into today's features. Returns undefined when the
 * key is unknown either way.
 */
export function readFeature(features, key) {
  if (!features) return undefined
  if (features[key] !== undefined) return Number(features[key]) || 0
  const legacy = LEGACY_FEATURE_MAP[key]
  if (!legacy || !legacy.to) return undefined
  let value = legacy.offset || 0
  let found = false
  for (const [target, factor] of legacy.to) {
    if (features[target] === undefined) continue
    found = true
    value += (Number(features[target]) || 0) * factor
  }
  if (!found) return undefined
  return Math.max(0, Math.min(1, value))
}

/** Current key for a possibly-legacy key (the first target of a rename). */
export function currentFeatureKey(key) {
  if (CATALOG_BY_KEY.has(key)) return key
  const target = LEGACY_FEATURE_MAP[key]?.to?.[0]
  return target && target[1] > 0 ? target[0] : null
}

/** Human label for any feature key (falls back to a title-cased key). */
export function featureLabel(key) {
  const entry = CATALOG_BY_KEY.get(key) || CATALOG_BY_KEY.get(currentFeatureKey(key))
  if (entry) return entry.label
  return String(key || '')
    .replace(/_index$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}
