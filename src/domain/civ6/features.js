/**
 * Civ 6 tile features: terrain features, natural wonders, artifacts and
 * game-mode specials — the keys of a county's `features` map. Entry fields are
 * described in terrains.js.
 *
 * Resources also land in `features` (the editor mirrors `resource` there), but
 * they're scored once, through resources.js, not again as features.
 */

export const TERRAIN_FEATURES = [
  { name: 'Woods', profile: { wilderness: 0.4, ecology: 0.25, rural: 0.15, extractive: 0.1 }, population: 0.9 },
  { name: 'Woods (old-growth)', profile: { wilderness: 0.55, ecology: 0.5, rural: 0.15 }, population: 0.9 },
  { name: 'Rainforest', profile: { ecology: 0.7, wilderness: 0.6, hardship: 0.15 }, population: 0.65 },
  { name: 'Marsh', profile: { ecology: 0.55, wilderness: 0.5, watershed: 0.3, hardship: 0.2 }, population: 0.7 },
  { name: 'Floodplains', profile: { agrarian: 0.55, watershed: 0.6 }, population: 1.4 },
  { name: 'Grassland Floodplains', profile: { agrarian: 0.6, watershed: 0.6 }, population: 1.4 },
  { name: 'Plains Floodplains', profile: { agrarian: 0.55, watershed: 0.6 }, population: 1.4 },
  { name: 'Desert Floodplains', profile: { agrarian: 0.45, watershed: 0.6, hardship: 0.2 }, population: 1.4 },
  { name: 'Oasis', profile: { watershed: 0.8, agrarian: 0.3, leisure: 0.2, commercial: 0.15 }, population: 1.3 },
  { name: 'Cliffs', aliases: ['Cliff'], profile: { coastal: 0.3, mountain: 0.2, wilderness: 0.2, leisure: 0.15 } },
  { name: 'Reef', profile: { ecology: 0.7, coastal: 0.3, maritime: 0.3 }, population: 0.85 },
  { name: 'Ice', profile: { hardship: 0.9, wilderness: 0.6, coastal: 0.2 }, population: 0.5 },
  { name: 'Volcano', profile: { mountain: 0.5, hardship: 0.4, wilderness: 0.4, spiritual: 0.15 } },
  { name: 'Volcanic Soil', profile: { agrarian: 0.45, hardship: 0.1 }, population: 1.25 },
  { name: 'Geothermal Fissure', profile: { leisure: 0.25, wilderness: 0.2, intellectual: 0.1 } },
  { name: 'Fallout', profile: { pollution: 0.9, hardship: 0.7 }, population: 0.5 },
  { name: 'Impact Zone', profile: { hardship: 0.8, wilderness: 0.3, spiritual: 0.15 }, population: 0.5 },
].map((entry) => ({ kind: 'Terrain feature', ...entry }))

export const SPECIAL_FEATURES = [
  { name: 'Antiquity Site', kind: 'Artifact', profile: { heritage: 0.7, cultural: 0.2, leisure: 0.1 } },
  { name: 'Shipwreck', kind: 'Artifact', profile: { heritage: 0.5, maritime: 0.2 } },
  { name: 'Ley Line', kind: 'Secret Societies', profile: { spiritual: 0.45, intellectual: 0.2 } },
]

// Every natural wonder is wild, ecologically special and draws visitors; on
// top of that, each reads as what it does in game.
const NATURAL_WONDER_BASE = { wilderness: 0.45, ecology: 0.4, leisure: 0.45 }

const NATURAL_WONDER_PROFILES = [
  ['Bermuda Triangle', { maritime: 0.5, coastal: 0.4, intellectual: 0.3 }],
  ['Chocolate Hills', { mountain: 0.4, leisure: 0.5, intellectual: 0.2 }],
  ['Cliffs of Dover', { coastal: 0.7, leisure: 0.6, cultural: 0.3 }],
  ['Crater Lake', { spiritual: 0.55, watershed: 0.8, mountain: 0.3 }],
  ['Dead Sea', { spiritual: 0.5, leisure: 0.5, coastal: 0.4 }],
  ['Delicate Arch', { spiritual: 0.5, hardship: 0.4 }],
  ['Eye of the Sahara', { hardship: 0.8, intellectual: 0.3, extractive: 0.2 }],
  ['Eyjafjallajokull', { mountain: 0.7, hardship: 0.3, agrarian: 0.2 }],
  ['Fountain of Youth', { spiritual: 0.5, intellectual: 0.3, watershed: 0.4 }],
  ['Galapagos Islands', { intellectual: 0.5, ecology: 0.9, coastal: 0.5 }],
  ["Giant's Causeway", { coastal: 0.5, cultural: 0.3, military: 0.2 }],
  ['Gobustan', { heritage: 0.6, cultural: 0.6 }],
  ['Great Barrier Reef', { ecology: 1, maritime: 0.4, intellectual: 0.3, coastal: 0.4 }, { population: 0.85 }],
  ['Ha Long Bay', { coastal: 0.6, leisure: 0.6, military: 0.2, agrarian: 0.2 }],
  ['Ik-Kil', { watershed: 0.7, spiritual: 0.3, infrastructure: 0.2 }],
  ['Lake Retba', { coastal: 0.4, commercial: 0.3, cultural: 0.3 }],
  ['Lysefjord', { coastal: 0.6, maritime: 0.4, mountain: 0.4 }],
  ['Mato Tipila', { mountain: 0.8, spiritual: 0.4 }],
  ['Matterhorn', { mountain: 1, leisure: 0.5, military: 0.2 }],
  ['Mount Everest', { mountain: 1, spiritual: 0.4, hardship: 0.4 }],
  ['Mount Kilimanjaro', { mountain: 0.9, agrarian: 0.3 }],
  ['Mount Roraima', { mountain: 0.9, spiritual: 0.3, intellectual: 0.3 }],
  ['Mount Vesuvius', { mountain: 0.8, hardship: 0.4, agrarian: 0.2 }],
  ['Paititi', { commercial: 0.5, heritage: 0.4, cultural: 0.3 }],
  ['Pamukkale', { leisure: 0.8, watershed: 0.5 }],
  ['Pantanal', { ecology: 0.9, wilderness: 0.6, watershed: 0.5, cultural: 0.2 }],
  ['Piopiotahi', { coastal: 0.4, mountain: 0.4, leisure: 0.5 }],
  ['Sahara el Beyda', { hardship: 0.8, commercial: 0.4 }],
  ['Torres del Paine', { mountain: 0.6, agrarian: 0.3, leisure: 0.5 }],
  ['Tsingy de Bemaraha', { wilderness: 0.5, intellectual: 0.3, cultural: 0.3 }],
  ['Ubsunur Hollow', { ecology: 0.7, spiritual: 0.3, watershed: 0.4, agrarian: 0.2 }],
  ['Uluru', { spiritual: 0.7, hardship: 0.5, cultural: 0.3 }],
  ['Yosemite', { mountain: 0.6, leisure: 0.6, intellectual: 0.2 }],
  ['Zhangye Danxia', { mountain: 0.7, military: 0.2, commercial: 0.2 }],
]

function mergeOver(base, specific) {
  const out = { ...base }
  for (const [key, value] of Object.entries(specific)) out[key] = Math.max(out[key] || 0, value)
  return out
}

export const NATURAL_WONDERS = NATURAL_WONDER_PROFILES.map(([name, profile, props = {}]) => ({
  name,
  kind: 'Natural wonder',
  profile: mergeOver(NATURAL_WONDER_BASE, profile),
  ...props,
}))

/**
 * Gathering Storm names the map's deserts, seas, mountain ranges and lakes, and
 * players name their own parks. Feature keys that aren't catalog entries are
 * matched against these keyword patterns instead (case-insensitive substring).
 * A key takes the profile of every pattern it matches, and population from the
 * first matching pattern that sets one.
 */
export const FEATURE_PATTERNS = [
  { id: 'floodplains', keywords: ['Floodplains'], profile: { agrarian: 0.5, watershed: 0.5 }, population: 1.4 },
  { id: 'volcanic-soil', keywords: ['Volcanic Soil'], profile: { agrarian: 0.4 }, population: 1.25 },
  { id: 'oasis', keywords: ['Oasis'], profile: { watershed: 0.7 }, population: 1.3 },
  { id: 'marsh', keywords: ['Marsh', 'Swamp', 'Wetland'], profile: { ecology: 0.45, wilderness: 0.4 }, population: 0.7 },
  { id: 'rainforest', keywords: ['Rainforest', 'Jungle'], profile: { ecology: 0.6, wilderness: 0.5 }, population: 0.65 },
  { id: 'woods', keywords: ['Woods', 'Forest'], profile: { wilderness: 0.35, ecology: 0.2 }, population: 0.9 },
  { id: 'reef', keywords: ['Reef'], profile: { ecology: 0.6, maritime: 0.2 }, population: 0.85 },
  { id: 'marine-reserve', keywords: ['Turtles', 'Coral', 'Marine Reserve'], profile: { ecology: 0.5 } },
  { id: 'desert', keywords: ['Desert', 'Sahara', 'Gobi', 'Kalahari', 'Outback'], profile: { hardship: 0.5, wilderness: 0.2 } },
  { id: 'national-park', keywords: ['National Park'], profile: { ecology: 0.4, leisure: 0.4 } },
  { id: 'highlands', keywords: ['Mountains', 'Mount', 'Peak', 'Highlands'], profile: { mountain: 0.4, wilderness: 0.2 } },
  { id: 'lake', keywords: ['Lake', 'Lagoon'], profile: { watershed: 0.6, coastal: 0.3 } },
  { id: 'sea', keywords: ['Sea', 'Ocean', 'Gulf', 'Bay', 'Strait'], profile: { coastal: 0.35, maritime: 0.2 } },
]

// Named seas and gulfs. The first keyword found names the county's basin.
export const MARITIME_BASIN_KEYWORDS = [
  'Gulf of Thailand', 'San Francisco Bay', 'Adriatic Sea', 'Bering Sea',
  'Atlantic Ocean', 'Pacific Ocean', 'Indian Ocean', 'Mediterranean Sea',
  'North Sea', 'Baltic Sea', 'South China Sea', 'Caribbean Sea',
  'Red Sea', 'Black Sea', 'Sea of Japan', 'Arabian Sea',
  'Gulf', 'Bay', 'Sea', 'Ocean', 'Strait',
]
