/**
 * Civ 6 tile improvements — standard, civilization-unique, city-state, governor
 * and game-mode. Together with districts.js and wonders.js these are the values
 * of a county's `improvement.name`. Entry fields are described in terrains.js.
 */

const tile = (name, props) => ({ name, kind: 'Tile improvement', ...props })
const unique = (name, civ, props) => ({ name, kind: 'Unique improvement', civ, ...props })
const cityState = (name, cityStateName, props) => ({ name, kind: 'City-state improvement', civ: cityStateName, ...props })

export const TILE_IMPROVEMENTS = [
  tile('Farm', { signals: { agrarian: 1 }, population: 1.25 }),
  tile('Plantation', { signals: { agrarian: 1 }, population: 1.25 }),
  tile('Pasture', { signals: { agrarian: 1 }, population: 1.25 }),
  tile('Mine', { signals: { extractive: 1, mine_or_corporation: 1 }, population: 1.25 }),
  tile('Quarry', { signals: { extractive: 1 } }),
  tile('Camp', { signals: { extractive: 1 } }),
  tile('Lumber Mill', { signals: { extractive: 0.8 }, population: 1.1 }),
  tile('Oil Well', { signals: { extractive: 1 } }),
  tile('Offshore Oil Rig', { signals: { extractive: 1, offshore: 1 } }),
  tile('Fishing Boats', { signals: { maritime: 1, offshore: 1 } }),
  tile('Seastead', { signals: { maritime: 1, offshore: 1 } }),
  tile('Fort', { signals: { encampment: 0.35 }, lean: { traditionalist_index: 0.02 } }),
  tile('Airstrip', { signals: { aerodrome: 0.6 } }),
  tile('Missile Silo', { signals: { encampment: 0.4, aerodrome: 0.3 } }),
  tile('Seaside Resort', { aliases: ['Beach Resort'], signals: { leisure: 1, maritime: 0.3 }, population: 1.1 }),
  tile('Ski Resort', { signals: { leisure: 1 }, population: 1.1 }),
  tile('Wind Farm', { signals: { energy: 1 }, population: 1.1 }),
  tile('Solar Farm', { signals: { energy: 1 }, population: 1.1 }),
  tile('Geothermal Plant', { signals: { energy: 1 }, population: 1.1 }),
  tile('Offshore Wind Farm', { signals: { maritime: 1, offshore: 1, energy: 1 } }),
  tile('Mountain Tunnel', { signals: { infrastructure: 1 } }),
  tile('National Park', { signals: { preserve: 1, leisure: 1 }, population: 0.85 }),
  tile('Barricade', { signals: { encampment: 0.25 } }),
  tile('Reinforced Barricade', { signals: { encampment: 0.3 } }),
  tile('Trap', { signals: { encampment: 0.2 } }),
  tile('Modernized Trap', { signals: { encampment: 0.25 } }),

  unique('Chateau', 'France', { signals: { leisure: 0.6, agrarian: 0.4 } }),
  unique('Chemamull', 'Mapuche', { signals: { leisure: 0.6 }, lean: { localist_index: 0.03 } }),
  unique('Feitoria', 'Portugal', { signals: { commercial_hub: 0.6, maritime: 0.5 } }),
  unique('Golf Course', 'Scotland', { signals: { leisure: 1 }, population: 1.1 }),
  unique('Great Wall', 'China', { signals: { encampment: 0.6, infrastructure: 0.4, civic_monument: 0.3 } }),
  unique('Hacienda', 'Gran Colombia', { signals: { agrarian: 1 }, population: 1.25 }),
  unique('Ice Hockey Rink', 'Canada', { signals: { leisure: 1 }, population: 1.1 }),
  unique('Kampung', 'Indonesia', { signals: { maritime: 1, residential: 0.5, offshore: 0.5 }, population: 1.25 }),
  unique('Kurgan', 'Scythia', { signals: { holy_site: 0.5, agrarian: 0.4 } }),
  unique('Mekewap', 'Cree', { signals: { agrarian: 0.6, extractive: 0.3 }, population: 1.25 }),
  unique('Mission', 'Spain', { signals: { holy_site: 0.7, campus: 0.3 }, lean: { localist_index: -0.02 } }),
  unique('Nubian Pyramid', 'Nubia', { signals: { holy_site: 0.5, civic_monument: 0.5 } }),
  unique('Open-Air Museum', 'Sweden', { signals: { theater: 0.6, leisure: 0.5 } }),
  unique('Outback Station', 'Australia', { signals: { agrarian: 1 }, population: 1.25 }),
  unique('Pa', 'Maori', { signals: { encampment: 0.6 }, lean: { localist_index: 0.03 } }),
  unique('Pairidaeza', 'Persia', { signals: { leisure: 0.8, holy_site: 0.3 } }),
  unique('Polder', 'Netherlands', { signals: { agrarian: 1, maritime: 0.5, infrastructure: 0.3 }, population: 1.25 }),
  unique('Qhapaq Nan', 'Inca', { signals: { infrastructure: 1 } }),
  unique('Rock-Hewn Church', 'Ethiopia', { signals: { holy_site: 0.8 } }),
  unique('Roman Fort', 'Rome', { signals: { encampment: 0.5 } }),
  unique('Sphinx', 'Egypt', { signals: { holy_site: 0.5, civic_monument: 0.5 } }),
  unique('Stepwell', 'India', { signals: { agrarian: 0.7, residential: 0.3, holy_site: 0.2 }, population: 1.25 }),
  unique('Terrace Farm', 'Inca', { signals: { agrarian: 1 }, population: 1.25 }),
  unique('Ziggurat', 'Sumeria', { signals: { campus: 0.6, civic_monument: 0.3 } }),

  cityState('Alcazar', 'Granada', { signals: { encampment: 0.4, campus: 0.3, civic_monument: 0.3 } }),
  cityState('Batey', 'Caguana', { signals: { leisure: 0.6, theater: 0.3 } }),
  cityState('Cahokia Mounds', 'Cahokia', { signals: { residential: 0.4, commercial_hub: 0.3, agrarian: 0.3 } }),
  cityState('Colossal Heads', 'La Venta', { signals: { holy_site: 0.6, civic_monument: 0.4 } }),
  cityState('Mahavihara', 'Nalanda', { signals: { campus: 0.6, holy_site: 0.6 } }),
  cityState('Moai', 'Rapa Nui', { signals: { civic_monument: 0.6, leisure: 0.4 } }),
  cityState('Monastery', 'Armagh', { signals: { holy_site: 0.8 } }),
  cityState('Nazca Line', 'Nazca', { signals: { holy_site: 0.5, leisure: 0.3 } }),
  cityState('Trading Dome', 'Samarkand', { signals: { commercial_hub: 0.8 } }),

  { name: 'City Park', kind: 'Governor improvement', civ: 'Liang', signals: { leisure: 0.8, residential: 0.3 }, population: 1.1 },
  { name: 'Fishery', kind: 'Governor improvement', civ: 'Liang', signals: { maritime: 1, agrarian: 0.4, offshore: 0.5 }, population: 1.25 },

  // Monopolies and Corporations.
  { name: 'Industry', kind: 'Game mode', signals: { industry: 1 } },
  { name: 'Corporation', kind: 'Game mode', signals: { corporation: 1, mine_or_corporation: 1 }, population: 1.25 },
  // Secret Societies (Sanguine Pact).
  { name: 'Vampire Castle', kind: 'Game mode', signals: { encampment: 0.4 }, lean: { localist_index: 0.05, restorationist_index: 0.04 } },
]
