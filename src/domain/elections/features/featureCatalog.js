/**
 * Catalog of the feature indices the scoring engine can weight, per scope.
 * Drives the Advanced Setup political-model matrix editor and lets the engine
 * present a complete, labeled list of knobs. Values are 0..1 unless noted.
 *
 * Keys match what features/*.js emit, plus three derived at scoring time:
 *   cross_continental_index, conquered_index, inverse_science_culture_index.
 */

// Shared economic / civic / geographic indices that exist at multiple scopes.
const SHARED = [
  ['urban_index', 'Urbanization', 'Economy'],
  ['urbanization_index', 'Urbanization (province)', 'Economy'],
  ['rural_index', 'Rural character', 'Economy'],
  ['industrial_index', 'Industrial base', 'Economy'],
  ['agrarian_index', 'Agrarian base', 'Economy'],
  ['commercial_index', 'Commerce (county)', 'Economy'],
  ['commerce_index', 'Commerce (province)', 'Economy'],
  ['worker_index', 'Industrial workforce', 'Economy'],
  ['worker_grievance_index', 'Worker grievance', 'Economy'],
  ['extractive_index', 'Extractive industry', 'Economy'],
  ['production_index', 'Production yield', 'Economy'],
  ['gold_index', 'Gold yield', 'Economy'],
  ['economic_diversity_index', 'Economic diversity', 'Economy'],
  ['yield_diversity_index', 'Yield diversity', 'Economy'],
  ['improved_status_index', 'Development / improvement', 'Economy'],
  ['development_index', 'Development', 'Economy'],
  ['provincial_power_index', 'Provincial power', 'Economy'],
  ['mine_or_corporation_index', 'Mining / corporations', 'Economy'],

  ['military_index', 'Military presence', 'Society'],
  ['intellectual_index', 'Intellectual / academic', 'Society'],
  ['spiritual_index', 'Spiritual / religious sites', 'Society'],
  ['cultural_elite_index', 'Cultural elite', 'Society'],
  ['cultural_output_index', 'Cultural output', 'Society'],
  ['culture_index', 'Culture yield', 'Society'],
  ['science_index', 'Science yield', 'Society'],
  ['faith_index', 'Faith yield', 'Society'],
  ['traditionalist_index', 'Traditionalism', 'Society'],
  ['localist_index', 'Localism / autonomy', 'Society'],
  ['restorationist_index', 'Restorationism', 'Society'],
  ['civic_monument_index', 'Civic monuments', 'Society'],
  ['residential_index', 'Residential', 'Society'],
  ['neighborhood_index', 'Neighborhoods', 'Society'],
  ['commercial_middle_class_index', 'Commercial middle class', 'Society'],
  ['food_index', 'Food yield', 'Society'],

  ['imperial_core_index', 'Imperial core', 'Identity & loyalty'],
  ['loyalty_index', 'Loyalty', 'Identity & loyalty'],
  ['happiness_index', 'Happiness', 'Identity & loyalty'],
  ['amenity_index', 'Amenities', 'Identity & loyalty'],
  ['growth_index', 'Growth', 'Identity & loyalty'],
  ['state_religion_share', 'State religion share', 'Identity & loyalty'],
  ['minority_religion_share', 'Minority religion share', 'Identity & loyalty'],
  ['religious_minority_index', 'Religious minority (county)', 'Identity & loyalty'],
  ['religious_homogeneity_index', 'Religious homogeneity', 'Identity & loyalty'],
  ['foreign_origin_index', 'Foreign origin', 'Identity & loyalty'],
  ['imperial_origin_index', 'Imperial origin', 'Identity & loyalty'],
  ['same_continent_index', 'Same continent as capital', 'Identity & loyalty'],
  ['cross_continental_index', 'Cross-continental', 'Identity & loyalty'],
  ['conquered_index', 'Conquered province', 'Identity & loyalty'],

  ['appeal_index', 'Tile appeal', 'Geography'],
  ['coastal_index', 'Coastal', 'Geography'],
  ['maritime_index', 'Maritime / naval', 'Geography'],
  ['mountain_index', 'Mountainous', 'Geography'],
  ['wilderness_index', 'Wilderness', 'Geography'],
  ['rainforest_index', 'Rainforest', 'Geography'],
  ['leisure_tourism_index', 'Leisure / tourism', 'Geography'],
  ['protected_marine_index', 'Protected marine', 'Geography'],
  ['offshore_development_index', 'Offshore development', 'Geography'],
  ['infrastructure_index', 'Infrastructure', 'Geography'],
  ['isolation_index', 'Isolation', 'Geography'],
  ['connectedness_index', 'Connectedness', 'Geography'],
  ['frontier_index', 'Frontier', 'Geography'],
  ['terrain_habitation_index', 'Habitability', 'Geography'],
  ['inverse_science_culture_index', 'Low science & culture', 'Geography'],
  ['pollution_index', 'Pollution', 'Geography'],
]

const SHARED_KEYS = new Set(SHARED.map(([key]) => key))

// Scope membership: which shared keys are meaningful where.
const COUNTY_ONLY = new Set([
  'urban_index', 'commercial_index', 'worker_index', 'religious_minority_index',
  'neighborhood_index', 'commercial_middle_class_index', 'mine_or_corporation_index',
  'improved_status_index', 'cultural_output_index', 'inverse_science_culture_index',
])
const PROVINCE_NATIONAL_ONLY = new Set([
  'urbanization_index', 'commerce_index', 'worker_grievance_index', 'minority_religion_share',
  'economic_diversity_index', 'development_index', 'provincial_power_index',
  'religious_homogeneity_index', 'isolation_index',
])

function scopesForKey(key) {
  if (COUNTY_ONLY.has(key)) return ['county']
  if (PROVINCE_NATIONAL_ONLY.has(key)) return ['province', 'national']
  // Identity/geography province-level signals not present at county scope.
  if (['foreign_origin_index', 'imperial_origin_index', 'same_continent_index', 'cross_continental_index',
       'connectedness_index', 'frontier_index', 'happiness_index', 'amenity_index', 'growth_index'].includes(key)) {
    return ['province', 'national']
  }
  return ['county', 'province', 'national']
}

export const FEATURE_CATALOG = SHARED.map(([key, label, group]) => ({
  key,
  label,
  group,
  scopes: scopesForKey(key),
}))

export const FEATURE_GROUPS = ['Economy', 'Society', 'Identity & loyalty', 'Geography']

/** Features available at a given scope, in catalog order. */
export function featuresForScope(scope) {
  return FEATURE_CATALOG.filter((entry) => entry.scopes.includes(scope))
}

/** Human label for any feature key (falls back to a title-cased key). */
export function featureLabel(key) {
  const entry = FEATURE_CATALOG.find((e) => e.key === key)
  if (entry) return entry.label
  return String(key || '')
    .replace(/_index$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

export { SHARED_KEYS }
