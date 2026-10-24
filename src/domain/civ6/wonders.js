/**
 * Civ 6 world wonders. Every wonder draws visitors and becomes part of the
 * area's history; beyond that each reads as what it is for — a temple as
 * religious life, a palace as the state, an arsenal as industry and navy.
 * Entry fields are described in terrains.js.
 */

const WONDER_BASE = { leisure: 0.35, heritage: 0.3 }

function wonder(name, profile, props = {}) {
  const merged = { ...WONDER_BASE }
  for (const [key, value] of Object.entries(profile)) merged[key] = Math.max(merged[key] || 0, value)
  return { name, kind: 'World wonder', profile: merged, ...props }
}

export const WONDERS = [
  wonder('Alhambra', { military: 0.6, civic: 0.4, cultural: 0.3 }),
  wonder('Amundsen-Scott Research Station', { intellectual: 0.9, hardship: 0.3 }),
  wonder('Angkor Wat', { spiritual: 0.8, urban: 0.2 }),
  wonder('Apadana', { civic: 0.8, cultural: 0.4 }),
  wonder('Big Ben', { commercial: 0.7, civic: 0.7 }),
  wonder('Biosphere', { ecology: 0.9, leisure: 0.5, intellectual: 0.4, pollution: -0.4 }, { population: 0.85 }),
  wonder('Bolshoi Theatre', { cultural: 0.9, urban: 0.3 }, { aliases: ['Bolshoi Theater'] }),
  wonder('Broadway', { cultural: 0.85, leisure: 0.6, urban: 0.4 }),
  wonder('Casa de Contratacion', { commercial: 0.6, civic: 0.5, maritime: 0.4 }),
  wonder('Chichen Itza', { cultural: 0.5, heritage: 0.5, civic: 0.4 }),
  wonder('Colosseum', { leisure: 0.85, civic: 0.4, urban: 0.3 }),
  wonder('Colossus', { maritime: 0.7, commercial: 0.55 }),
  wonder('Cristo Redentor', { leisure: 0.7, spiritual: 0.65 }),
  wonder('Eiffel Tower', { leisure: 0.7, civic: 0.6, urban: 0.4 }),
  wonder('Estadio do Maracana', { leisure: 0.9, urban: 0.4, middle_class: 0.3 }),
  wonder('Etemenanki', { intellectual: 0.7, spiritual: 0.3, agrarian: 0.2 }),
  wonder('Forbidden City', { civic: 0.95, cultural: 0.4 }),
  wonder('Golden Gate Bridge', { infrastructure: 0.9, leisure: 0.5, urban: 0.3 }),
  wonder('Great Bath', { infrastructure: 0.5, spiritual: 0.4, watershed: 0.4, middle_class: 0.2 }),
  wonder('Great Library', { intellectual: 0.9, cultural: 0.4 }),
  wonder('Great Lighthouse', { maritime: 0.8, infrastructure: 0.3 }),
  wonder('Great Zimbabwe', { commercial: 0.7, civic: 0.5, agrarian: 0.2 }),
  wonder('Hagia Sophia', { spiritual: 0.9, cultural: 0.3 }),
  wonder('Hanging Gardens', { leisure: 0.5, agrarian: 0.45, middle_class: 0.3, ecology: 0.2 }),
  wonder('Hermitage', { cultural: 0.9 }),
  wonder('Huey Teocalli', { spiritual: 0.6, watershed: 0.4, agrarian: 0.3 }),
  wonder('Jebel Barkal', { spiritual: 0.7, extractive: 0.35, military: 0.2 }),
  wonder('Kilwa Kisiwani', { commercial: 0.6, civic: 0.3, maritime: 0.3 }),
  wonder('Kotoku-in', { spiritual: 0.7, military: 0.35 }),
  wonder('Machu Picchu', { mountain: 0.5, leisure: 0.5, commercial: 0.45 }),
  wonder('Mahabodhi Temple', { spiritual: 0.9, ecology: 0.2 }),
  wonder('Mausoleum at Halicarnassus', { civic: 0.5, heritage: 0.4, coastal: 0.4 }),
  wonder('Meenakshi Temple', { spiritual: 0.9, cultural: 0.3 }),
  wonder('Mont St. Michel', { spiritual: 0.85, heritage: 0.4, coastal: 0.2 }),
  wonder('Oracle', { spiritual: 0.85, cultural: 0.3 }),
  wonder('Orszaghaz', { civic: 0.9, cultural: 0.3 }, { aliases: ['Orsaghaz'] }),
  wonder('Oxford University', { intellectual: 0.95, middle_class: 0.3 }),
  wonder('Panama Canal', { infrastructure: 0.9, maritime: 0.6, commercial: 0.5 }),
  wonder('Petra', { commercial: 0.6, heritage: 0.4, hardship: 0.3 }),
  wonder('Potala Palace', { spiritual: 0.7, civic: 0.6, mountain: 0.3 }),
  wonder('Pyramids', { civic: 0.6, heritage: 0.6, worker: 0.2, hardship: 0.2 }),
  wonder('Ruhr Valley', { industrial: 0.9, worker: 0.6, pollution: 0.55, extractive: 0.45 }),
  wonder("St. Basil's Cathedral", { spiritual: 0.85, cultural: 0.3 }),
  wonder('Statue of Liberty', { civic: 0.7, leisure: 0.5, maritime: 0.3 }),
  wonder('Statue of Zeus', { military: 0.7, spiritual: 0.3, civic: 0.3 }),
  wonder('Stonehenge', { spiritual: 0.85, heritage: 0.5 }),
  wonder('Sydney Opera House', { cultural: 0.9, leisure: 0.5, maritime: 0.2 }),
  wonder('Taj Mahal', { leisure: 0.6, civic: 0.5, cultural: 0.5, spiritual: 0.3 }),
  wonder('Temple of Artemis', { leisure: 0.4, spiritual: 0.4, agrarian: 0.3, rural: 0.2 }),
  wonder('Terracotta Army', { military: 0.8, heritage: 0.5 }),
  wonder('Torre de Belem', { maritime: 0.6, commercial: 0.5, civic: 0.3 }),
  wonder('University of Sankore', { intellectual: 0.85, spiritual: 0.35 }),
  wonder('Venetian Arsenal', { maritime: 0.7, industrial: 0.6, military: 0.4, worker: 0.4 }, { aliases: ['Venetial Arsenal'] }),
]
