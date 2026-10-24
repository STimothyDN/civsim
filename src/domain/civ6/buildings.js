/**
 * Civ 6 buildings, by the district they're built in. Besides the shared entry
 * fields (terrains.js), a building may carry:
 *   tier    — which building ladder it climbs. The county formulas use the share
 *             of a ladder that's built: count / BUILDING_TIERS[tier], capped at 1.
 *   housing — extra ambient population weight (allocateCountyPopulations).
 * A unique building names the building it `replaces` and inherits its tier,
 * lean and housing unless it sets its own.
 */

// Ladder sizes. Faith keeps the original four-name list's size, so a full
// Shrine + Temple + worship building Holy Site reads 0.75, as it always has.
export const BUILDING_TIERS = {
  housing: 5,
  energy: 5,
  industry: 2,
  harbor: 3,
  military: 3,
  science: 3,
  faith: 4,
  commerce: 3,
  monument: 1,
}

const building = (name, district, props = {}) => ({ name, kind: 'Building', district, ...props })
const unique = (name, district, replaces, civ, props = {}) => ({ name, kind: 'Unique building', district, replaces, civ, ...props })
const worship = (name) => ({ name, kind: 'Worship building', district: 'Holy Site', tier: 'faith' })
const plaza = (name, lean, props = {}) => ({ name, kind: 'Government Plaza building', district: 'Government Plaza', lean, ...props })

export const BUILDINGS = [
  building('Palace', 'City Center', { lean: { civic_monument_index: 0.08, cultural_elite_index: 0.03 } }),
  building('Monument', 'City Center', { tier: 'monument' }),
  building('Granary', 'City Center', { tier: 'housing', housing: 0.1, lean: { agrarian_index: 0.02, residential_index: 0.02 } }),
  building('Water Mill', 'City Center', { tier: 'housing', housing: 0.1, lean: { agrarian_index: 0.02, worker_index: 0.02 } }),
  unique('Palgum', 'City Center', 'Water Mill', 'Babylon'),
  building('Ancient Walls', 'City Center', { lean: { military_index: 0.03, traditionalist_index: 0.02 } }),
  building('Medieval Walls', 'City Center', { lean: { military_index: 0.04, traditionalist_index: 0.02 } }),
  building('Renaissance Walls', 'City Center', { lean: { military_index: 0.05, traditionalist_index: 0.02 } }),
  unique('Tsikhe', 'City Center', 'Renaissance Walls', 'Georgia', { lean: { military_index: 0.05, spiritual_index: 0.02 } }),
  building('Sewer', 'City Center', { tier: 'housing', housing: 0.25, lean: { residential_index: 0.03, infrastructure_index: 0.02 } }),
  building('Flood Barrier', 'City Center', { lean: { infrastructure_index: 0.05 }, housing: 0.15 }),
  { name: 'Old God Obelisk', kind: 'Secret Societies', district: 'City Center', tier: 'faith', lean: { spiritual_index: 0.02 } },

  building('Library', 'Campus', { tier: 'science' }),
  building('University', 'Campus', { tier: 'science' }),
  unique('Madrasa', 'Campus', 'University', 'Arabia', { lean: { spiritual_index: 0.02 } }),
  unique('Navigation School', 'Campus', 'University', 'Portugal', { lean: { maritime_index: 0.03 } }),
  { name: 'Alchemical Society', kind: 'Secret Societies', district: 'Campus', replaces: 'University' },
  building('Research Lab', 'Campus', { tier: 'science' }),

  building('Amphitheater', 'Theater Square', { aliases: ['Ampitheater', 'Amphitheatre'], lean: { cultural_elite_index: 0.04 } }),
  unique('Marae', 'Theater Square', 'Amphitheater', 'Maori', { lean: { cultural_elite_index: 0.04, wilderness_index: 0.02 } }),
  building('Art Museum', 'Theater Square', { lean: { cultural_elite_index: 0.05 } }),
  building('Archaeological Museum', 'Theater Square', { lean: { cultural_elite_index: 0.04, restorationist_index: 0.03 } }),
  building('Broadcast Center', 'Theater Square', { lean: { cultural_elite_index: 0.03, leisure_tourism_index: 0.02 } }),
  unique('Film Studio', 'Theater Square', 'Broadcast Center', 'America'),

  building('Shrine', 'Holy Site', { tier: 'faith' }),
  building('Temple', 'Holy Site', { tier: 'faith' }),
  unique('Stave Church', 'Holy Site', 'Temple', 'Norway'),
  unique('Prasat', 'Holy Site', 'Temple', 'Khmer'),
  worship('Cathedral'),
  worship('Dar-e Mehr'),
  worship('Gurdwara'),
  worship('Meeting House'),
  worship('Mosque'),
  worship('Pagoda'),
  worship('Stupa'),
  worship('Synagogue'),
  worship('Wat'),

  building('Barracks', 'Encampment', { tier: 'military' }),
  unique('Basilikoi Paides', 'Encampment', 'Barracks', 'Macedon'),
  building('Stable', 'Encampment', { tier: 'military' }),
  unique('Ordu', 'Encampment', 'Stable', 'Mongolia'),
  building('Armory', 'Encampment', { tier: 'military' }),
  building('Military Academy', 'Encampment', { tier: 'military' }),

  building('Market', 'Commercial Hub', { tier: 'commerce' }),
  unique('Sukiennice', 'Commercial Hub', 'Market', 'Poland'),
  building('Bank', 'Commercial Hub', { tier: 'commerce' }),
  unique('Grand Bazaar', 'Commercial Hub', 'Bank', 'Ottomans'),
  { name: 'Gilded Vault', kind: 'Secret Societies', district: 'Commercial Hub', replaces: 'Bank' },
  building('Stock Exchange', 'Commercial Hub', { tier: 'commerce' }),

  building('Lighthouse', 'Harbor', { tier: 'harbor' }),
  building('Shipyard', 'Harbor', { tier: 'harbor' }),
  building('Seaport', 'Harbor', { tier: 'harbor' }),

  building('Workshop', 'Industrial Zone', { tier: 'industry' }),
  building('Factory', 'Industrial Zone', { tier: 'industry' }),
  unique('Electronics Factory', 'Industrial Zone', 'Factory', 'Japan'),
  building('Power Plant', 'Industrial Zone', { tier: 'energy', lean: { industrial_index: 0.03, worker_index: 0.02 } }),
  building('Coal Power Plant', 'Industrial Zone', { tier: 'energy', lean: { industrial_index: 0.03, worker_index: 0.02 } }),
  building('Oil Power Plant', 'Industrial Zone', { tier: 'energy', lean: { industrial_index: 0.03, extractive_index: 0.02 } }),
  building('Nuclear Power Plant', 'Industrial Zone', { tier: 'energy', lean: { industrial_index: 0.03, intellectual_index: 0.02 } }),

  building('Arena', 'Entertainment Complex', { lean: { leisure_tourism_index: 0.04, urban_index: 0.02 } }),
  unique('Tlachtli', 'Entertainment Complex', 'Arena', 'Aztec', { lean: { leisure_tourism_index: 0.04, spiritual_index: 0.02 } }),
  building('Zoo', 'Entertainment Complex', { lean: { leisure_tourism_index: 0.05 } }),
  unique('Thermal Bath', 'Entertainment Complex', 'Zoo', 'Hungary'),
  building('Stadium', 'Entertainment Complex', { lean: { leisure_tourism_index: 0.05, urban_index: 0.02 } }),

  building('Ferris Wheel', 'Water Park', { lean: { leisure_tourism_index: 0.04 } }),
  building('Aquarium', 'Water Park', { lean: { leisure_tourism_index: 0.04, intellectual_index: 0.02 } }),
  building('Aquatics Center', 'Water Park', { lean: { leisure_tourism_index: 0.05 } }),

  building('Hangar', 'Aerodrome', { lean: { military_index: 0.05 } }),
  building('Airport', 'Aerodrome', { lean: { infrastructure_index: 0.06, commercial_index: 0.02 } }),

  building('Food Market', 'Neighborhood', { lean: { residential_index: 0.04, commercial_index: 0.03 } }),
  building('Shopping Mall', 'Neighborhood', { lean: { commercial_index: 0.05, residential_index: 0.02 } }),

  building('Consulate', 'Diplomatic Quarter', { lean: { intellectual_index: 0.03, commercial_index: 0.02 } }),
  building('Chancery', 'Diplomatic Quarter', { lean: { intellectual_index: 0.03, commercial_index: 0.02 } }),

  building('Hydroelectric Dam', 'Dam', { tier: 'energy', lean: { infrastructure_index: 0.03, industrial_index: 0.02 } }),

  building('Grove', 'Preserve', { lean: { wilderness_index: 0.04, spiritual_index: 0.03 } }),
  building('Sanctuary', 'Preserve', { lean: { wilderness_index: 0.05, spiritual_index: 0.03 } }),

  plaza('Ancestral Hall', { civic_monument_index: 0.04, residential_index: 0.03 }),
  plaza('Audience Chamber', { civic_monument_index: 0.05 }),
  plaza("Warlord's Throne", { military_index: 0.06 }),
  plaza('Foreign Ministry', { civic_monument_index: 0.03, intellectual_index: 0.02, commercial_index: 0.02 }),
  plaza("Grand Master's Chapel", { spiritual_index: 0.04, military_index: 0.03 }),
  plaza('Intelligence Agency', { military_index: 0.03, civic_monument_index: 0.02 }),
  plaza("Queen's Bibliotheque", { cultural_elite_index: 0.05 }, { civ: 'Kristina' }),
  plaza('National History Museum', { cultural_elite_index: 0.05 }),
  plaza('Royal Society', { intellectual_index: 0.04, industrial_index: 0.02 }),
  plaza('War Department', { military_index: 0.06 }),

  // Districts and improvements older saves recorded as buildings; still
  // scored, never suggested.
  { name: 'Aqueduct', kind: 'Building', tier: 'housing', housing: 0.2, hidden: true },
  { name: 'Neighborhood', kind: 'Building', tier: 'housing', housing: 0.3, hidden: true },
  { name: 'Solar Farm', kind: 'Building', tier: 'energy', hidden: true },
]
