/**
 * Civ 6 tile features: terrain features, natural wonders, artifacts and
 * game-mode specials — the keys of a county's `features` map. Entry fields are
 * described in terrains.js.
 *
 * Resources also land in `features` (the editor mirrors `resource` there), but
 * they're scored once, through resources.js, not again as features.
 */

export const TERRAIN_FEATURES = [
  { name: 'Woods', signals: { natural: 0.5 }, population: 0.9 },
  { name: 'Woods (old-growth)', signals: { natural: 1 }, population: 0.9 },
  { name: 'Rainforest', signals: { natural: 1, rainforest: 1 }, population: 0.65 },
  { name: 'Marsh', signals: { natural: 1 }, population: 0.7 },
  { name: 'Floodplains', signals: { floodplain: 1 }, lean: { agrarian_index: 0.05 }, population: 1.4 },
  { name: 'Grassland Floodplains', signals: { floodplain: 1 }, lean: { agrarian_index: 0.05 }, population: 1.4 },
  { name: 'Plains Floodplains', signals: { floodplain: 1 }, lean: { agrarian_index: 0.05 }, population: 1.4 },
  { name: 'Desert Floodplains', signals: { floodplain: 1, desert: 1 }, lean: { agrarian_index: 0.04 }, population: 1.4 },
  { name: 'Oasis', signals: { natural: 1 }, population: 1.3 },
  { name: 'Cliffs', aliases: ['Cliff'], signals: { natural: 1 } },
  { name: 'Reef', signals: { protected_marine: 1 }, population: 0.85 },
  { name: 'Ice', signals: { natural: 1 }, lean: { wilderness_index: 0.05, terrain_habitation_index: -0.3 }, population: 0.5 },
  { name: 'Volcano', signals: { natural: 1 } },
  { name: 'Volcanic Soil', signals: { natural: 1 }, population: 1.25 },
  { name: 'Geothermal Fissure', signals: { natural: 1 }, lean: { intellectual_index: 0.03 } },
  { name: 'Fallout', lean: { terrain_habitation_index: -0.4, localist_index: 0.03, restorationist_index: 0.03 }, population: 0.5 },
  { name: 'Impact Zone', lean: { terrain_habitation_index: -0.4, spiritual_index: 0.03 }, population: 0.5 },
].map((entry) => ({ kind: 'Terrain feature', ...entry }))

export const SPECIAL_FEATURES = [
  { name: 'Antiquity Site', kind: 'Artifact', lean: { restorationist_index: 0.05, cultural_elite_index: 0.03 } },
  { name: 'Shipwreck', kind: 'Artifact', lean: { restorationist_index: 0.03, maritime_index: 0.03 } },
  { name: 'Ley Line', kind: 'Secret Societies', lean: { spiritual_index: 0.05, intellectual_index: 0.03 } },
]

// Every natural wonder is wild, protected country (signals.natural); its lean
// follows what the wonder does in game.
export const NATURAL_WONDERS = [
  { name: 'Bermuda Triangle', lean: { maritime_index: 0.04, intellectual_index: 0.03 } },
  { name: 'Chocolate Hills', lean: { leisure_tourism_index: 0.03, intellectual_index: 0.02 } },
  { name: 'Cliffs of Dover', lean: { leisure_tourism_index: 0.04, cultural_elite_index: 0.02 } },
  { name: 'Crater Lake', lean: { spiritual_index: 0.05 } },
  { name: 'Dead Sea', lean: { spiritual_index: 0.04, leisure_tourism_index: 0.02 } },
  { name: 'Delicate Arch', lean: { spiritual_index: 0.04, leisure_tourism_index: 0.02 } },
  { name: 'Eye of the Sahara', signals: { desert: 1 }, lean: { intellectual_index: 0.03, extractive_index: 0.02 } },
  { name: 'Eyjafjallajokull', lean: { agrarian_index: 0.03, leisure_tourism_index: 0.02 } },
  { name: 'Fountain of Youth', lean: { spiritual_index: 0.04, intellectual_index: 0.03 } },
  { name: 'Galapagos Islands', lean: { intellectual_index: 0.05 } },
  { name: "Giant's Causeway", lean: { military_index: 0.03, leisure_tourism_index: 0.03 } },
  { name: 'Gobustan', lean: { cultural_elite_index: 0.04 } },
  { name: 'Great Barrier Reef', signals: { protected_marine: 1 }, lean: { intellectual_index: 0.04, maritime_index: 0.02 }, population: 0.85 },
  { name: 'Ha Long Bay', lean: { military_index: 0.03, leisure_tourism_index: 0.03 } },
  { name: 'Ik-Kil', lean: { infrastructure_index: 0.03, spiritual_index: 0.02 } },
  { name: 'Lake Retba', lean: { commercial_index: 0.03, cultural_elite_index: 0.02 } },
  { name: 'Lysefjord', lean: { maritime_index: 0.04, military_index: 0.02 } },
  { name: 'Mato Tipila', lean: { spiritual_index: 0.04 } },
  { name: 'Matterhorn', lean: { military_index: 0.03, leisure_tourism_index: 0.03 } },
  { name: 'Mount Everest', lean: { spiritual_index: 0.04 } },
  { name: 'Mount Kilimanjaro', lean: { agrarian_index: 0.04 } },
  { name: 'Mount Roraima', lean: { spiritual_index: 0.03, intellectual_index: 0.03 } },
  { name: 'Mount Vesuvius', lean: { agrarian_index: 0.03, localist_index: 0.02 } },
  { name: 'Paititi', lean: { commercial_index: 0.04, cultural_elite_index: 0.02 } },
  { name: 'Pamukkale', lean: { leisure_tourism_index: 0.05 } },
  { name: 'Pantanal', lean: { wilderness_index: 0.03, cultural_elite_index: 0.02 } },
  { name: 'Piopiotahi', lean: { leisure_tourism_index: 0.03, commercial_index: 0.02 } },
  { name: 'Sahara el Beyda', signals: { desert: 1 }, lean: { commercial_index: 0.04 } },
  { name: 'Torres del Paine', lean: { agrarian_index: 0.04 } },
  { name: 'Tsingy de Bemaraha', lean: { intellectual_index: 0.03, cultural_elite_index: 0.02 } },
  { name: 'Ubsunur Hollow', lean: { spiritual_index: 0.03, agrarian_index: 0.02 } },
  { name: 'Uluru', lean: { spiritual_index: 0.05 } },
  { name: 'Yosemite', lean: { leisure_tourism_index: 0.03, intellectual_index: 0.02 } },
  { name: 'Zhangye Danxia', lean: { military_index: 0.03, commercial_index: 0.03 } },
].map((entry) => ({ kind: 'Natural wonder', ...entry, signals: { natural: 1, ...entry.signals } }))

/**
 * Gathering Storm names the map's deserts, seas, mountain ranges and so on, and
 * players name their own parks. Feature keys that aren't catalog entries are
 * matched against these keyword patterns instead (case-insensitive substring).
 * A key takes signals and lean from every pattern it matches, and population
 * from the first matching pattern that sets one.
 */
export const FEATURE_PATTERNS = [
  { id: 'floodplains', keywords: ['Floodplains'], signals: { floodplain: 1 }, lean: { agrarian_index: 0.05 }, population: 1.4 },
  { id: 'volcanic-soil', keywords: ['Volcanic Soil'], population: 1.25 },
  { id: 'oasis', keywords: ['Oasis'], population: 1.3 },
  { id: 'marsh', keywords: ['Marsh'], population: 0.7 },
  { id: 'rainforest', keywords: ['Rainforest'], signals: { rainforest: 1 }, population: 0.65 },
  { id: 'woods', keywords: ['Woods'], population: 0.9 },
  { id: 'reef', keywords: ['Reef'], signals: { protected_marine: 1 }, population: 0.85 },
  { id: 'marine-reserve', keywords: ['Turtles', 'Coral', 'Marine Reserve'], signals: { protected_marine: 1 } },
  { id: 'desert', keywords: ['Desert', 'Sahara', 'Gobi', 'Kalahari', 'Outback'], signals: { desert: 1 }, lean: { wilderness_index: 0.04, localist_index: 0.02 } },
]

// Named seas and gulfs. The first keyword found names the county's basin.
export const MARITIME_BASIN_KEYWORDS = [
  'Gulf of Thailand', 'San Francisco Bay', 'Adriatic Sea', 'Bering Sea',
  'Atlantic Ocean', 'Pacific Ocean', 'Indian Ocean', 'Mediterranean Sea',
  'North Sea', 'Baltic Sea', 'South China Sea', 'Caribbean Sea',
  'Red Sea', 'Black Sea', 'Sea of Japan', 'Arabian Sea',
  'Gulf', 'Bay', 'Sea', 'Ocean', 'Strait',
]
