/**
 * Civ 6 terrains, spelled the way the county editor records them: a base
 * terrain on its own, "Base (Hills)", "Base (Mountain)", or a water tile.
 *
 * Every catalog entry (here and in the sibling files) may carry:
 *   profile    — what the thing is, as weights on the profile dimensions in
 *                elections/features/countyProfile.js (0.1 faint … 0.9 defining;
 *                negative dampens). A county combines every entry it holds.
 *   population — ambient population multiplier (see allocateCountyPopulations).
 */

const LAND_BASES = [
  // Lush, well-watered farmland.
  { name: 'Grassland', profile: { agrarian: 0.3, rural: 0.2 }, population: 1, hillsPopulation: 0.75 },
  // Mixed farming and production country.
  { name: 'Plains', profile: { agrarian: 0.25, rural: 0.2, extractive: 0.05 }, population: 1, hillsPopulation: 0.75 },
  // Dry, sparse and unforgiving.
  { name: 'Desert', profile: { hardship: 0.65, wilderness: 0.3, rural: 0.15 }, population: 0.4, hillsPopulation: 0.4 },
  { name: 'Tundra', profile: { hardship: 0.55, wilderness: 0.35, rural: 0.2 }, population: 0.5, hillsPopulation: 0.45 },
  { name: 'Snow', profile: { hardship: 0.9, wilderness: 0.5 }, population: 0.2, hillsPopulation: 0.2 },
]

// Hills: upland, defensible, mined.
const HILLS = { mountain: 0.4, military: 0.15, extractive: 0.1 }
// Mountains: impassable peaks; the base terrain underneath matters less.
const MOUNTAIN = { mountain: 0.95, wilderness: 0.45, hardship: 0.35 }
const MOUNTAIN_BASE_SCALE = 0.5
const MOUNTAIN_POPULATION = 0.45

/** Soft-OR two profiles (b optionally scaled), matching how counties combine entries. */
function combine(a = {}, b = {}, scaleB = 1) {
  const out = { ...a }
  for (const [key, value] of Object.entries(b)) {
    const w = value * scaleB
    out[key] = Math.round((1 - (1 - (out[key] || 0)) * (1 - w)) * 1000) / 1000
  }
  return out
}

function landTerrains(base) {
  return [
    { name: base.name, profile: base.profile, population: base.population },
    { name: `${base.name} (Hills)`, elevation: 'Hills', profile: combine(base.profile, HILLS), population: base.hillsPopulation },
    {
      name: `${base.name} (Mountain)`,
      elevation: 'Mountain',
      profile: combine(MOUNTAIN, base.profile, MOUNTAIN_BASE_SCALE),
      population: MOUNTAIN_POPULATION,
      blocksAmbientPopulation: true,
    },
  ]
}

export const TERRAINS = [
  ...LAND_BASES.flatMap(landTerrains),
  { name: 'Mountains', aliases: ['Mountain'], elevation: 'Mountain', profile: MOUNTAIN, population: MOUNTAIN_POPULATION, blocksAmbientPopulation: true },
  { name: 'Coast', profile: { coastal: 0.9, maritime: 0.35 }, population: 0.75, water: true, blocksAmbientPopulation: true },
  { name: 'Ocean', profile: { maritime: 0.5, coastal: 0.4, wilderness: 0.15 }, population: 0.75, water: true, blocksAmbientPopulation: true },
  // Fresh water: shoreline living without the sea lanes.
  { name: 'Lake', profile: { watershed: 0.8, coastal: 0.55, leisure: 0.15, maritime: 0.1 }, population: 0.55, water: true },
].map((entry) => ({ kind: entry.water ? 'Water' : entry.elevation === 'Mountain' ? 'Mountain' : entry.elevation === 'Hills' ? 'Hills' : 'Flat', ...entry }))

// Search order when a terrain string isn't spelled exactly like a catalog entry.
export const TERRAIN_BASE_ORDER = ['Snow', 'Desert', 'Tundra', 'Grassland', 'Plains']

// Ambient population for terrain that matches nothing in the catalog.
export const DEFAULT_TERRAIN_POPULATION = 0.75
