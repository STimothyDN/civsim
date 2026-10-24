/**
 * Civ 6 districts. A unique district names the district it `replaces` and
 * inherits its signals and population, adding its own lean where it differs.
 * Entry fields are described in terrains.js.
 */

const district = (name, props) => ({ name, kind: 'District', ...props })
const unique = (name, replaces, civ, props = {}) => ({ name, kind: 'Unique district', replaces, civ, ...props })

export const DISTRICTS = [
  district('City Center', { signals: { residential: 1, civic_monument: 1 }, population: 3 }),
  district('Campus', { signals: { campus: 1 }, population: 1.9 }),
  district('Theater Square', { signals: { theater: 1 }, population: 1.8 }),
  district('Holy Site', { signals: { holy_site: 1 }, population: 1.8 }),
  district('Encampment', { signals: { encampment: 1 }, population: 1.6 }),
  district('Commercial Hub', { signals: { commercial_hub: 1 }, population: 2.2 }),
  district('Harbor', { aliases: ['Harbour'], signals: { maritime: 1 } }),
  district('Industrial Zone', { signals: { industrial_zone: 1 }, population: 2 }),
  district('Entertainment Complex', { signals: { leisure: 1 }, population: 1.7 }),
  district('Water Park', { signals: { leisure: 1 } }),
  district('Aqueduct', { signals: { infrastructure: 1 }, population: 1.4 }),
  district('Neighborhood', { aliases: ['Neighbourhood'], signals: { residential: 1, neighborhood: 1 }, population: 2.4 }),
  district('Preserve', { signals: { preserve: 1, leisure: 1 }, population: 0.85 }),
  district('Canal', { signals: { infrastructure: 1, maritime: 0.5 } }),
  district('Dam', { signals: { infrastructure: 1 } }),
  district('Aerodrome', { signals: { aerodrome: 1 } }),
  district('Spaceport', { signals: { campus: 0.5, industrial_zone: 0.4, infrastructure: 0.5 } }),
  district('Government Plaza', { signals: { civic_monument: 1 }, lean: { localist_index: -0.03 } }),
  district('Diplomatic Quarter', { signals: { diplomatic: 1 } }),

  unique('Observatory', 'Campus', 'Maya'),
  unique('Seowon', 'Campus', 'Korea', { lean: { intellectual_index: 0.03 } }),
  unique('Acropolis', 'Theater Square', 'Greece', { lean: { civic_monument_index: 0.03 } }),
  unique('Lavra', 'Holy Site', 'Russia'),
  unique('Ikanda', 'Encampment', 'Zulu', { lean: { residential_index: 0.02 } }),
  unique('Thanh', 'Encampment', 'Vietnam', { lean: { cultural_elite_index: 0.02 } }),
  unique('Suguba', 'Commercial Hub', 'Mali', { lean: { spiritual_index: 0.02 } }),
  unique('Cothon', 'Harbor', 'Phoenicia', { lean: { commercial_index: 0.02 } }),
  unique('Royal Navy Dockyard', 'Harbor', 'England', { lean: { military_index: 0.03 } }),
  unique('Hansa', 'Industrial Zone', 'Germany'),
  unique('Oppidum', 'Industrial Zone', 'Gaul', { lean: { military_index: 0.03 } }),
  unique('Street Carnival', 'Entertainment Complex', 'Brazil'),
  unique('Hippodrome', 'Entertainment Complex', 'Byzantium', { lean: { military_index: 0.04 } }),
  unique('Copacabana', 'Water Park', 'Brazil'),
  unique('Bath', 'Aqueduct', 'Rome', { lean: { leisure_tourism_index: 0.02 } }),
  unique('Mbanza', 'Neighborhood', 'Kongo'),
]
