/**
 * Civ 6 tile improvements — standard, civilization-unique, city-state, governor
 * and game-mode. Together with districts.js and wonders.js these are the values
 * of a county's `improvement.name`. Entry fields are described in terrains.js.
 */

const tile = (name, profile, props = {}) => ({ name, kind: 'Tile improvement', profile, ...props })
const unique = (name, civ, profile, props = {}) => ({ name, kind: 'Unique improvement', civ, profile, ...props })
const cityState = (name, cityStateName, profile, props = {}) => ({ name, kind: 'City-state improvement', civ: cityStateName, profile, ...props })

export const TILE_IMPROVEMENTS = [
  // Working the land.
  tile('Farm', { agrarian: 0.8, rural: 0.5 }, { population: 1.25 }),
  tile('Plantation', { agrarian: 0.7, rural: 0.4, commercial: 0.2, worker: 0.15 }, { population: 1.25 }),
  tile('Pasture', { agrarian: 0.65, rural: 0.6 }, { population: 1.25 }),
  tile('Camp', { rural: 0.45, extractive: 0.35, wilderness: 0.3 }),
  // Working the ground.
  tile('Mine', { extractive: 0.85, worker: 0.5, pollution: 0.25, rural: 0.1 }, { population: 1.25 }),
  tile('Quarry', { extractive: 0.75, worker: 0.4, pollution: 0.15 }),
  tile('Lumber Mill', { extractive: 0.65, worker: 0.35, industrial: 0.2, ecology: -0.3 }, { population: 1.1 }),
  tile('Oil Well', { extractive: 0.85, industrial: 0.4, worker: 0.4, pollution: 0.55 }),
  tile('Offshore Oil Rig', { extractive: 0.8, maritime: 0.4, industrial: 0.35, worker: 0.35, pollution: 0.5, ecology: -0.3 }),
  // Working the sea.
  tile('Fishing Boats', { maritime: 0.8, coastal: 0.3, worker: 0.25, agrarian: 0.2 }),
  tile('Seastead', { maritime: 0.6, urban: 0.4, development: 0.4, middle_class: 0.3, coastal: 0.3 }),
  // Defense.
  tile('Fort', { military: 0.6, infrastructure: 0.15 }),
  tile('Airstrip', { military: 0.5, infrastructure: 0.3 }),
  tile('Missile Silo', { military: 0.85 }),
  tile('Barricade', { military: 0.4 }),
  tile('Reinforced Barricade', { military: 0.45 }),
  tile('Trap', { military: 0.3 }),
  tile('Modernized Trap', { military: 0.4 }),
  // Leisure.
  tile('Seaside Resort', { leisure: 0.9, coastal: 0.5, commercial: 0.3, middle_class: 0.2 }, { aliases: ['Beach Resort'], population: 1.1 }),
  tile('Ski Resort', { leisure: 0.85, mountain: 0.3, commercial: 0.25 }, { population: 1.1 }),
  tile('National Park', { ecology: 0.85, leisure: 0.7, wilderness: 0.5, pollution: -0.6 }, { population: 0.85 }),
  // Clean energy and modern works.
  tile('Wind Farm', { industrial: 0.35, infrastructure: 0.3, development: 0.3, pollution: -0.4 }, { population: 1.1 }),
  tile('Solar Farm', { industrial: 0.35, infrastructure: 0.3, development: 0.3, pollution: -0.4 }, { population: 1.1 }),
  tile('Geothermal Plant', { industrial: 0.4, infrastructure: 0.3, development: 0.3, pollution: -0.3 }, { population: 1.1 }),
  tile('Offshore Wind Farm', { industrial: 0.3, maritime: 0.4, infrastructure: 0.3, development: 0.3, pollution: -0.4 }),
  tile('Mountain Tunnel', { infrastructure: 0.8, development: 0.3 }),

  unique('Chateau', 'France', { leisure: 0.55, agrarian: 0.4, cultural: 0.4, commercial: 0.2 }),
  unique('Chemamull', 'Mapuche', { heritage: 0.4, leisure: 0.4, cultural: 0.35, localist: 0.3 }),
  unique('Feitoria', 'Portugal', { commercial: 0.6, maritime: 0.5 }),
  unique('Golf Course', 'Scotland', { leisure: 0.8, middle_class: 0.3, rural: 0.2 }, { population: 1.1 }),
  unique('Great Wall', 'China', { military: 0.7, civic: 0.35, infrastructure: 0.3, heritage: 0.3, leisure: 0.2 }),
  unique('Hacienda', 'Gran Colombia', { agrarian: 0.8, rural: 0.4, commercial: 0.25, worker: 0.2 }, { population: 1.25 }),
  unique('Ice Hockey Rink', 'Canada', { leisure: 0.8, middle_class: 0.25 }, { population: 1.1 }),
  unique('Kampung', 'Indonesia', { maritime: 0.7, coastal: 0.5, urban: 0.25, middle_class: 0.2 }, { population: 1.25 }),
  unique('Kurgan', 'Scythia', { spiritual: 0.45, heritage: 0.4, rural: 0.4, traditionalist: 0.3 }),
  unique('Mekewap', 'Cree', { agrarian: 0.45, rural: 0.35, extractive: 0.25, localist: 0.2 }, { population: 1.25 }),
  unique('Mission', 'Spain', { spiritual: 0.7, intellectual: 0.3, localist: -0.3 }),
  unique('Nubian Pyramid', 'Nubia', { civic: 0.45, spiritual: 0.4, heritage: 0.4 }),
  unique('Open-Air Museum', 'Sweden', { cultural: 0.6, heritage: 0.5, leisure: 0.5 }),
  unique('Outback Station', 'Australia', { rural: 0.7, agrarian: 0.65, hardship: 0.2 }, { population: 1.25 }),
  unique('Pa', 'Maori', { military: 0.6, rural: 0.3, localist: 0.3 }),
  unique('Pairidaeza', 'Persia', { leisure: 0.7, cultural: 0.35, commercial: 0.2 }),
  unique('Polder', 'Netherlands', { agrarian: 0.7, infrastructure: 0.4, maritime: 0.35, watershed: 0.3 }, { population: 1.25 }),
  unique('Qhapaq Nan', 'Inca', { infrastructure: 0.85, mountain: 0.2 }),
  unique('Rock-Hewn Church', 'Ethiopia', { spiritual: 0.8, heritage: 0.4, leisure: 0.3 }),
  unique('Roman Fort', 'Rome', { military: 0.7 }),
  unique('Sphinx', 'Egypt', { civic: 0.5, heritage: 0.5, spiritual: 0.4, leisure: 0.3 }),
  unique('Stepwell', 'India', { agrarian: 0.45, spiritual: 0.3, watershed: 0.3, middle_class: 0.2 }, { population: 1.25 }),
  unique('Terrace Farm', 'Inca', { agrarian: 0.8, rural: 0.4, mountain: 0.3 }, { population: 1.25 }),
  unique('Ziggurat', 'Sumeria', { intellectual: 0.5, civic: 0.35, cultural: 0.3, heritage: 0.3 }),

  cityState('Alcazar', 'Granada', { military: 0.45, intellectual: 0.3, civic: 0.3, cultural: 0.2 }),
  cityState('Batey', 'Caguana', { leisure: 0.5, cultural: 0.4 }),
  cityState('Cahokia Mounds', 'Cahokia', { urban: 0.3, commercial: 0.3, agrarian: 0.3, heritage: 0.3, middle_class: 0.2 }),
  cityState('Colossal Heads', 'La Venta', { heritage: 0.5, spiritual: 0.45, civic: 0.4 }),
  cityState('Mahavihara', 'Nalanda', { intellectual: 0.55, spiritual: 0.55 }),
  cityState('Moai', 'Rapa Nui', { heritage: 0.45, civic: 0.45, leisure: 0.45 }),
  cityState('Monastery', 'Armagh', { spiritual: 0.75, intellectual: 0.2, rural: 0.2 }),
  cityState('Nazca Line', 'Nazca', { heritage: 0.5, spiritual: 0.4, leisure: 0.3 }),
  cityState('Trading Dome', 'Samarkand', { commercial: 0.8 }),

  { name: 'City Park', kind: 'Governor improvement', civ: 'Liang', profile: { leisure: 0.6, middle_class: 0.4, ecology: 0.2, urban: 0.2 }, population: 1.1 },
  { name: 'Fishery', kind: 'Governor improvement', civ: 'Liang', profile: { maritime: 0.75, agrarian: 0.3, worker: 0.2 }, population: 1.25 },

  // Monopolies and Corporations.
  { name: 'Industry', kind: 'Game mode', profile: { industrial: 0.55, worker: 0.45, commercial: 0.3, pollution: 0.3 } },
  { name: 'Corporation', kind: 'Game mode', profile: { commercial: 0.7, industrial: 0.45, worker: 0.3, urban: 0.3, pollution: 0.2 }, population: 1.25 },
  // Secret Societies (Sanguine Pact).
  { name: 'Vampire Castle', kind: 'Game mode', profile: { military: 0.4, restorationist: 0.4, heritage: 0.3, localist: 0.3 } },
]
