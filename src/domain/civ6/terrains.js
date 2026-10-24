/**
 * Civ 6 terrains, spelled the way the county editor records them: a base
 * terrain on its own, "Base (Hills)", "Base (Mountain)", or a water tile.
 *
 * Every catalog entry (here and in the sibling files) may carry:
 *   signals    — classification the county feature formulas read (0..1), e.g.
 *                { coast_terrain: 1 }. A county takes the strongest value of
 *                each signal across its terrain, features, resource and
 *                improvement.
 *   lean       — direct nudges, in index points, to county political features
 *                (keys from features/countySignals.js LEAN_KEYS).
 *   population — ambient population multiplier (see allocateCountyPopulations).
 */

const HILLS_LEAN = { traditionalist_index: 0.03, military_index: 0.03, mountain_index: 0.08 }

const LAND_BASES = [
  // Lush farmland.
  { name: 'Grassland', lean: { agrarian_index: 0.04, rural_index: 0.02 }, population: 1, hillsPopulation: 0.75 },
  // Mixed farming and production.
  { name: 'Plains', lean: { agrarian_index: 0.03, worker_index: 0.02 }, population: 1, hillsPopulation: 0.75 },
  // Harsh, sparsely settled country.
  { name: 'Desert', lean: { wilderness_index: 0.05, localist_index: 0.03 }, population: 0.4, hillsPopulation: 0.4 },
  { name: 'Tundra', lean: { wilderness_index: 0.05, localist_index: 0.04, traditionalist_index: 0.03 }, population: 0.5, hillsPopulation: 0.45 },
  { name: 'Snow', lean: { wilderness_index: 0.08, localist_index: 0.05 }, population: 0.2, hillsPopulation: 0.2 },
]

const MOUNTAIN_POPULATION = 0.45

function addLean(a = {}, b = {}) {
  const out = { ...a }
  for (const [key, value] of Object.entries(b)) out[key] = (out[key] || 0) + value
  return out
}

function landTerrains(base) {
  return [
    { name: base.name, base: base.name, lean: base.lean, population: base.population },
    { name: `${base.name} (Hills)`, base: base.name, elevation: 'Hills', lean: addLean(base.lean, HILLS_LEAN), population: base.hillsPopulation },
    {
      name: `${base.name} (Mountain)`,
      base: base.name,
      elevation: 'Mountain',
      signals: { mountain_terrain: 1 },
      lean: base.lean,
      population: MOUNTAIN_POPULATION,
      blocksAmbientPopulation: true,
    },
  ]
}

export const TERRAINS = [
  ...LAND_BASES.flatMap(landTerrains),
  {
    name: 'Mountains',
    aliases: ['Mountain'],
    elevation: 'Mountain',
    signals: { mountain_terrain: 1 },
    population: MOUNTAIN_POPULATION,
    blocksAmbientPopulation: true,
  },
  { name: 'Coast', signals: { coast_terrain: 1 }, population: 0.75, water: true, blocksAmbientPopulation: true },
  { name: 'Ocean', signals: { ocean_terrain: 1 }, population: 0.75, water: true, blocksAmbientPopulation: true },
  // Fresh water: a shoreline community, but no sea lanes.
  { name: 'Lake', lean: { coastal_index: 0.12, maritime_index: 0.04, leisure_tourism_index: 0.03 }, population: 0.55, water: true },
].map((entry) => ({ kind: entry.water ? 'Water' : entry.elevation === 'Mountain' ? 'Mountain' : entry.elevation === 'Hills' ? 'Hills' : 'Flat', ...entry }))

// Search order when a terrain string isn't spelled exactly like a catalog entry.
export const TERRAIN_BASE_ORDER = ['Snow', 'Desert', 'Tundra', 'Grassland', 'Plains']

// Ambient population for terrain that matches nothing in the catalog.
export const DEFAULT_TERRAIN_POPULATION = 0.75
