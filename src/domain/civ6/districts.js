/**
 * Civ 6 districts. A unique district names the district it `replaces` and
 * inherits its profile and population; its own profile adds what makes it
 * different. Entry fields are described in terrains.js.
 */

const district = (name, profile, props = {}) => ({ name, kind: 'District', profile, ...props })
const unique = (name, replaces, civ, profile = {}) => ({ name, kind: 'Unique district', replaces, civ, profile })

export const DISTRICTS = [
  district('City Center', { urban: 0.9, civic: 0.6, development: 0.4, infrastructure: 0.3, middle_class: 0.3, commercial: 0.2 }, { population: 3 }),
  district('Campus', { intellectual: 0.85, urban: 0.45, development: 0.3, middle_class: 0.25 }, { population: 1.9 }),
  district('Theater Square', { cultural: 0.85, urban: 0.45, leisure: 0.3, middle_class: 0.2 }, { population: 1.8 }),
  district('Holy Site', { spiritual: 0.85, urban: 0.2, heritage: 0.2 }, { population: 1.8 }),
  district('Encampment', { military: 0.9, urban: 0.15, worker: 0.15 }, { population: 1.6 }),
  district('Commercial Hub', { commercial: 0.85, urban: 0.55, middle_class: 0.45 }, { population: 2.2 }),
  district('Harbor', { maritime: 0.85, coastal: 0.4, urban: 0.35, commercial: 0.3, worker: 0.3 }, { aliases: ['Harbour'] }),
  district('Industrial Zone', { industrial: 0.9, worker: 0.75, pollution: 0.6, urban: 0.4 }, { population: 2 }),
  district('Entertainment Complex', { leisure: 0.85, urban: 0.5, middle_class: 0.3 }, { population: 1.7 }),
  district('Water Park', { leisure: 0.85, middle_class: 0.3, coastal: 0.3, urban: 0.3 }),
  district('Aqueduct', { infrastructure: 0.75, watershed: 0.4, development: 0.3, urban: 0.2 }, { population: 1.4 }),
  district('Neighborhood', { middle_class: 0.85, urban: 0.75, development: 0.3 }, { aliases: ['Neighbourhood'], population: 2.4 }),
  district('Preserve', { ecology: 0.7, wilderness: 0.4, spiritual: 0.25, pollution: -0.5 }, { population: 0.85 }),
  district('Canal', { infrastructure: 0.85, maritime: 0.45, commercial: 0.3 }),
  district('Dam', { infrastructure: 0.8, watershed: 0.4, industrial: 0.25, ecology: -0.25 }),
  district('Aerodrome', { military: 0.55, infrastructure: 0.4, development: 0.35, urban: 0.3, pollution: 0.15 }),
  district('Spaceport', { development: 0.7, intellectual: 0.6, industrial: 0.5, urban: 0.3 }),
  // The seat of central government pulls a province toward the state.
  district('Government Plaza', { civic: 0.9, urban: 0.5, localist: -0.4 }),
  district('Diplomatic Quarter', { civic: 0.5, urban: 0.4, intellectual: 0.35, commercial: 0.35, middle_class: 0.2 }),

  unique('Observatory', 'Campus', 'Maya', { agrarian: 0.2 }),
  unique('Seowon', 'Campus', 'Korea', { intellectual: 0.9 }),
  unique('Acropolis', 'Theater Square', 'Greece', { civic: 0.3, mountain: 0.2 }),
  unique('Lavra', 'Holy Site', 'Russia', { cultural: 0.2 }),
  unique('Ikanda', 'Encampment', 'Zulu', { urban: 0.25 }),
  unique('Thanh', 'Encampment', 'Vietnam', { cultural: 0.3 }),
  unique('Suguba', 'Commercial Hub', 'Mali', { spiritual: 0.2 }),
  unique('Cothon', 'Harbor', 'Phoenicia', { commercial: 0.45 }),
  unique('Royal Navy Dockyard', 'Harbor', 'England', { military: 0.4 }),
  unique('Hansa', 'Industrial Zone', 'Germany', { commercial: 0.3 }),
  unique('Oppidum', 'Industrial Zone', 'Gaul', { military: 0.3, extractive: 0.2 }),
  unique('Street Carnival', 'Entertainment Complex', 'Brazil', { cultural: 0.3 }),
  unique('Hippodrome', 'Entertainment Complex', 'Byzantium', { military: 0.4 }),
  unique('Copacabana', 'Water Park', 'Brazil'),
  unique('Bath', 'Aqueduct', 'Rome', { leisure: 0.3, middle_class: 0.2 }),
  unique('Mbanza', 'Neighborhood', 'Kongo', { commercial: 0.2 }),
]
