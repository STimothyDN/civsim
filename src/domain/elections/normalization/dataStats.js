/**
 * Data-derived normalization constants based on jayavarman.json analysis.
 * Statistics calculated from 55 provinces and 131 detailed counties.
 */

// Province-level field statistics (n=55)
export const PROVINCE_STATS = {
  loyalty: { min: 0, max: 43, mean: 27.2, p95: 38.6 },
  happiness_percentage: { min: 100, max: 120, mean: 110.2, p95: 120 },
  growth_percentage: { min: 50, max: 120, mean: 108.2, p95: 120 },
  net_amenities: { min: 2, max: 11, mean: 3.9, p95: 8.3 },
  population: { min: 5, max: 36, mean: 19.5, p95: 31.3 },
}

// Province yields per capita (divided by civ population)
export const PROVINCE_YIELD_STATS = {
  food: { min: 2.27, max: 5.14, mean: 3.28, p95: 4.52 },
  production: { min: 1.25, max: 9.24, mean: 4.18, p95: 6.57 },
  gold: { min: 1.10, max: 18.20, mean: 7.93, p95: 12.47 },
  culture: { min: 1.09, max: 6.41, mean: 2.32, p95: 4.42 },
  science: { min: 0.50, max: 3.29, mean: 1.39, p95: 2.58 },
  faith: { min: 0.00, max: 3.23, mean: 1.27, p95: 3.01 },
}

// County-level field statistics (n=131)
export const COUNTY_YIELD_STATS = {
  food: { min: 1.0, max: 7.0, mean: 3.0, p95: 6.0 },
  production: { min: 1.0, max: 12.0, mean: 2.6, p95: 6.0 },
  gold: { min: 1.0, max: 24.0, mean: 4.6, p95: 14.0 },
  culture: { min: 1.0, max: 15.0, mean: 6.1, p95: 15.0 },
  science: { min: 1.0, max: 13.0, mean: 2.7, p95: 11.3 },
  faith: { min: 2.0, max: 13.0, mean: 9.2, p95: 12.7 },
}

export const COUNTY_FIELD_STATS = {
  appeal: { min: 1, max: 12, mean: 5.2, p95: 10 },
  distance_from_center: { min: 1, max: 5, mean: 2.8, p95: 5 },
  citizens_working: { min: 1, max: 3, mean: 1.5, p95: 3 },
}

// Data-derived normalization maximums (using p95 or max+margin)
export const NORMALIZATION_MAX = {
  // Province fields
  loyalty: 45,                    // was 50, actual max 43
  happiness_percentage: 120,    // was 120, range is 100-120
  growth_percentage: 120,       // was not normalized directly
  net_amenities: 12,            // was 10, actual max 11

  // Province yields per capita
  food_per_capita: 6,           // was 4, actual max 5.14
  production_per_capita: 10,    // was 5, actual max 9.24
  gold_per_capita: 20,          // was 10, actual max 18.20
  culture_per_capita: 7,        // was 6, actual max 6.41
  science_per_capita: 4,        // was 5, actual max 3.29
  faith_per_capita: 4,          // was 5, actual max 3.23

  // County yields
  county_food: 8,               // was 8, actual max 7.0
  county_production: 12,        // was 12, actual max 12.0
  county_gold: 24,              // was 24, actual max 24.0
  county_culture: 15,           // was 15, actual max 15.0
  county_science: 14,           // was 12, actual max 13.0
  county_faith: 14,             // was 12, actual max 13.0

  // County fields
  appeal: 12,                   // was 8, actual max 12.0
  distance_from_center: 5,      // unchanged, matches data
  citizens_working: 3,          // unchanged, matches data
}

/**
 * Reference data information for documentation
 */
export const DATA_SOURCE_INFO = {
  file: 'jayavarman.json',
  province_count: 55,
  region_count: 10,
  provinces_with_detailed_counties: 3,
  total_detailed_counties: 131,
  total_population: 652304532,
  population_range: { min: 398830, max: 35538933 },
}

/**
 * Get normalization maximum for a given field
 * @param {string} field - Field name
 * @returns {number} Maximum value for normalization
 */
export function getNormalizationMax(field) {
  return NORMALIZATION_MAX[field] || 1
}

/**
 * Calculate coefficient of variation (diversity index)
 * @param {number[]} values - Array of values
 * @returns {number} CV between 0 and 1
 */
export function coefficientOfVariation(values) {
  if (!values || values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean === 0) return 0
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const std = Math.sqrt(variance)
  return std / mean
}

/**
 * Calculate Herfindahl-Hirschman Index for concentration
 * @param {number[]} shares - Array of share values (should sum to 1 or raw counts)
 * @returns {number} HHI between 0 and 1
 */
export function hhiIndex(shares) {
  if (!shares || shares.length === 0) return 0
  const total = shares.reduce((a, b) => a + b, 0)
  if (total === 0) return 0
  const normalized = shares.map(s => s / total)
  return normalized.reduce((sum, s) => sum + s * s, 0)
}
