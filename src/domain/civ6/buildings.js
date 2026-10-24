/**
 * Civ 6 buildings, by the district they're built in. Besides the shared entry
 * fields (terrains.js), a building may carry `housing`: extra ambient
 * population weight (allocateCountyPopulations).
 *
 * A building's profile combines with its district's (diminishing returns), so a
 * fully built Campus reads close to, but never past, the top of the scale.
 * A unique building names the building it `replaces` and inherits its profile
 * and housing unless it sets its own.
 */

const building = (name, district, profile, props = {}) => ({ name, kind: 'Building', district, profile, ...props })
const unique = (name, district, replaces, civ, profile, props = {}) => ({ name, kind: 'Unique building', district, replaces, civ, ...(profile ? { profile } : {}), ...props })
const worship = (name, profile) => ({ name, kind: 'Worship building', district: 'Holy Site', profile })
const plaza = (name, profile, props = {}) => ({ name, kind: 'Government Plaza building', district: 'Government Plaza', profile, ...props })

export const BUILDINGS = [
  building('Palace', 'City Center', { civic: 0.8, cultural: 0.3 }),
  building('Monument', 'City Center', { civic: 0.45, cultural: 0.2 }),
  building('Granary', 'City Center', { agrarian: 0.25, development: 0.15 }, { housing: 0.1 }),
  building('Water Mill', 'City Center', { agrarian: 0.25, industrial: 0.15, worker: 0.1 }, { housing: 0.1 }),
  unique('Palgum', 'City Center', 'Water Mill', 'Babylon', { agrarian: 0.35, watershed: 0.3 }),
  building('Ancient Walls', 'City Center', { military: 0.3 }),
  building('Medieval Walls', 'City Center', { military: 0.4 }),
  building('Renaissance Walls', 'City Center', { military: 0.5 }),
  unique('Tsikhe', 'City Center', 'Renaissance Walls', 'Georgia', { military: 0.5, spiritual: 0.2, leisure: 0.2 }),
  building('Sewer', 'City Center', { infrastructure: 0.4, development: 0.35, middle_class: 0.15 }, { housing: 0.25 }),
  building('Flood Barrier', 'City Center', { infrastructure: 0.55, development: 0.4, watershed: 0.2 }, { housing: 0.15 }),
  { name: 'Old God Obelisk', kind: 'Secret Societies', district: 'City Center', profile: { spiritual: 0.45, heritage: 0.3 } },

  building('Library', 'Campus', { intellectual: 0.4, cultural: 0.1 }),
  building('University', 'Campus', { intellectual: 0.5, middle_class: 0.2 }),
  unique('Madrasa', 'Campus', 'University', 'Arabia', { intellectual: 0.5, spiritual: 0.3 }),
  unique('Navigation School', 'Campus', 'University', 'Portugal', { intellectual: 0.45, maritime: 0.35 }),
  { name: 'Alchemical Society', kind: 'Secret Societies', district: 'Campus', replaces: 'University', profile: { intellectual: 0.5, spiritual: 0.2 } },
  building('Research Lab', 'Campus', { intellectual: 0.6, development: 0.35, industrial: 0.1 }),

  building('Amphitheater', 'Theater Square', { cultural: 0.4, leisure: 0.2 }, { aliases: ['Ampitheater', 'Amphitheatre'] }),
  unique('Marae', 'Theater Square', 'Amphitheater', 'Maori', { cultural: 0.4, leisure: 0.2, ecology: 0.2 }),
  building('Art Museum', 'Theater Square', { cultural: 0.55, leisure: 0.25 }),
  building('Archaeological Museum', 'Theater Square', { cultural: 0.5, heritage: 0.55, leisure: 0.25 }),
  building('Broadcast Center', 'Theater Square', { cultural: 0.45, development: 0.25, urban: 0.2 }),
  unique('Film Studio', 'Theater Square', 'Broadcast Center', 'America', { cultural: 0.5, leisure: 0.35, urban: 0.2 }),

  building('Shrine', 'Holy Site', { spiritual: 0.35 }),
  building('Temple', 'Holy Site', { spiritual: 0.45 }),
  unique('Stave Church', 'Holy Site', 'Temple', 'Norway', { spiritual: 0.45, rural: 0.1 }),
  unique('Prasat', 'Holy Site', 'Temple', 'Khmer', { spiritual: 0.5 }),
  worship('Cathedral', { spiritual: 0.6, cultural: 0.2 }),
  worship('Dar-e Mehr', { spiritual: 0.55 }),
  worship('Gurdwara', { spiritual: 0.5, agrarian: 0.1 }),
  worship('Meeting House', { spiritual: 0.5, worker: 0.1 }),
  worship('Mosque', { spiritual: 0.6 }),
  worship('Pagoda', { spiritual: 0.55, middle_class: 0.1 }),
  worship('Stupa', { spiritual: 0.55, leisure: 0.1 }),
  worship('Synagogue', { spiritual: 0.55, cultural: 0.1 }),
  worship('Wat', { spiritual: 0.5, intellectual: 0.2 }),

  building('Barracks', 'Encampment', { military: 0.45 }),
  unique('Basilikoi Paides', 'Encampment', 'Barracks', 'Macedon', { military: 0.45, intellectual: 0.2 }),
  building('Stable', 'Encampment', { military: 0.45, rural: 0.15 }),
  unique('Ordu', 'Encampment', 'Stable', 'Mongolia', { military: 0.5, rural: 0.15 }),
  building('Armory', 'Encampment', { military: 0.5, industrial: 0.1 }),
  building('Military Academy', 'Encampment', { military: 0.6, intellectual: 0.1 }),

  building('Market', 'Commercial Hub', { commercial: 0.45, middle_class: 0.2 }),
  unique('Sukiennice', 'Commercial Hub', 'Market', 'Poland', { commercial: 0.5, industrial: 0.15 }),
  building('Bank', 'Commercial Hub', { commercial: 0.55, middle_class: 0.25 }),
  unique('Grand Bazaar', 'Commercial Hub', 'Bank', 'Ottomans', { commercial: 0.6 }),
  { name: 'Gilded Vault', kind: 'Secret Societies', district: 'Commercial Hub', replaces: 'Bank', profile: { commercial: 0.55 } },
  building('Stock Exchange', 'Commercial Hub', { commercial: 0.65, middle_class: 0.3 }),

  building('Lighthouse', 'Harbor', { maritime: 0.4 }),
  building('Shipyard', 'Harbor', { maritime: 0.45, worker: 0.3, industrial: 0.25 }),
  building('Seaport', 'Harbor', { maritime: 0.55, commercial: 0.2, worker: 0.2 }),

  building('Workshop', 'Industrial Zone', { industrial: 0.4, worker: 0.3 }),
  building('Factory', 'Industrial Zone', { industrial: 0.55, worker: 0.45, pollution: 0.3 }),
  unique('Electronics Factory', 'Industrial Zone', 'Factory', 'Japan', { industrial: 0.55, worker: 0.35, intellectual: 0.15, pollution: 0.2 }),
  building('Power Plant', 'Industrial Zone', { industrial: 0.45, pollution: 0.45 }),
  building('Coal Power Plant', 'Industrial Zone', { industrial: 0.45, pollution: 0.6, worker: 0.2 }),
  building('Oil Power Plant', 'Industrial Zone', { industrial: 0.45, pollution: 0.5 }),
  building('Nuclear Power Plant', 'Industrial Zone', { industrial: 0.5, intellectual: 0.2, pollution: 0.15 }),

  building('Arena', 'Entertainment Complex', { leisure: 0.45, urban: 0.1 }),
  unique('Tlachtli', 'Entertainment Complex', 'Arena', 'Aztec', { leisure: 0.45, spiritual: 0.2 }),
  building('Zoo', 'Entertainment Complex', { leisure: 0.45, ecology: 0.15 }),
  unique('Thermal Bath', 'Entertainment Complex', 'Zoo', 'Hungary', { leisure: 0.5, watershed: 0.2 }),
  building('Stadium', 'Entertainment Complex', { leisure: 0.55, middle_class: 0.2 }),

  building('Ferris Wheel', 'Water Park', { leisure: 0.45 }),
  building('Aquarium', 'Water Park', { leisure: 0.45, intellectual: 0.2, ecology: 0.15 }),
  building('Aquatics Center', 'Water Park', { leisure: 0.5, middle_class: 0.15 }),

  building('Hangar', 'Aerodrome', { military: 0.45 }),
  building('Airport', 'Aerodrome', { infrastructure: 0.45, commercial: 0.25, leisure: 0.15 }),

  building('Food Market', 'Neighborhood', { middle_class: 0.35, commercial: 0.3, agrarian: 0.1 }),
  building('Shopping Mall', 'Neighborhood', { commercial: 0.45, middle_class: 0.4, leisure: 0.2 }),

  building('Consulate', 'Diplomatic Quarter', { civic: 0.35, intellectual: 0.2 }),
  building('Chancery', 'Diplomatic Quarter', { civic: 0.4, intellectual: 0.25 }),

  building('Hydroelectric Dam', 'Dam', { industrial: 0.35, infrastructure: 0.4, pollution: -0.2 }),

  building('Grove', 'Preserve', { ecology: 0.35, spiritual: 0.25 }),
  building('Sanctuary', 'Preserve', { ecology: 0.45, wilderness: 0.3 }),

  plaza('Ancestral Hall', { civic: 0.4, development: 0.2 }),
  plaza('Audience Chamber', { civic: 0.5 }),
  plaza("Warlord's Throne", { military: 0.5, civic: 0.3 }),
  plaza('Foreign Ministry', { civic: 0.45, intellectual: 0.15 }),
  plaza("Grand Master's Chapel", { spiritual: 0.4, military: 0.35 }),
  plaza('Intelligence Agency', { civic: 0.4, military: 0.3 }),
  plaza("Queen's Bibliotheque", { cultural: 0.55, civic: 0.3 }, { civ: 'Kristina' }),
  plaza('National History Museum', { cultural: 0.55, heritage: 0.4 }),
  plaza('Royal Society', { intellectual: 0.45, industrial: 0.2 }),
  plaza('War Department', { military: 0.6, civic: 0.3 }),

  // Districts and improvements older saves recorded as buildings; still
  // scored, never suggested.
  { name: 'Aqueduct', kind: 'Building', profile: { infrastructure: 0.4 }, housing: 0.2, hidden: true },
  { name: 'Neighborhood', kind: 'Building', profile: { middle_class: 0.4 }, housing: 0.3, hidden: true },
  { name: 'Solar Farm', kind: 'Building', profile: { industrial: 0.2, pollution: -0.2 }, hidden: true },
]
