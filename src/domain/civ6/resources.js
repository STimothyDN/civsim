/**
 * Civ 6 resources — the county `resource` field. Entry fields are described in
 * terrains.js. Any resource at all also counts toward extraction and resource
 * development in countyFeatures.js; the entries add what's specific to each.
 */

const bonus = (name, props) => ({ name, kind: 'Bonus resource', ...props })
const luxury = (name, lean, props = {}) => ({ name, kind: 'Luxury resource', signals: { luxury_resource: 1 }, lean, ...props })
const strategic = (name, props) => ({ name, kind: 'Strategic resource', ...props })

export const RESOURCES = [
  bonus('Bananas', { signals: { food_resource: 1 } }),
  bonus('Cattle', { signals: { food_resource: 0.6 } }),
  bonus('Copper', { lean: { extractive_index: 0.05, commercial_index: 0.02 } }),
  bonus('Crabs', { lean: { maritime_index: 0.04, commercial_index: 0.02 } }),
  bonus('Deer', { lean: { wilderness_index: 0.04, rural_index: 0.03 } }),
  bonus('Fish', { signals: { food_resource: 0.4 }, lean: { maritime_index: 0.04 } }),
  bonus('Maize', { signals: { food_resource: 1 } }),
  bonus('Rice', { signals: { food_resource: 1 } }),
  bonus('Sheep', { signals: { food_resource: 0.6 } }),
  bonus('Stone', { lean: { extractive_index: 0.05, civic_monument_index: 0.02 } }),
  bonus('Wheat', { signals: { food_resource: 1 } }),

  luxury('Amber', { cultural_elite_index: 0.03, extractive_index: 0.02 }),
  luxury('Cinnamon', { commercial_index: 0.05 }),
  luxury('Citrus', { agrarian_index: 0.04 }),
  luxury('Cloves', { commercial_index: 0.05 }),
  luxury('Cocoa', { commercial_index: 0.04, agrarian_index: 0.02 }),
  luxury('Coffee', { cultural_elite_index: 0.03, commercial_index: 0.02 }),
  luxury('Cosmetics', { commercial_index: 0.04, urban_index: 0.02 }),
  luxury('Cotton', { commercial_index: 0.03, agrarian_index: 0.02, worker_index: 0.02 }),
  luxury('Diamonds', { extractive_index: 0.04, commercial_index: 0.04 }),
  luxury('Dyes', { spiritual_index: 0.03, commercial_index: 0.02 }),
  luxury('Furs', { wilderness_index: 0.04, commercial_index: 0.02 }),
  luxury('Gypsum', { extractive_index: 0.04, commercial_index: 0.02 }),
  luxury('Honey', { agrarian_index: 0.03, rural_index: 0.02 }),
  luxury('Incense', { spiritual_index: 0.05 }),
  luxury('Ivory', { wilderness_index: 0.03, commercial_index: 0.03 }),
  luxury('Jade', { cultural_elite_index: 0.04, extractive_index: 0.02 }),
  luxury('Jeans', { commercial_index: 0.04, urban_index: 0.02 }),
  luxury('Marble', { civic_monument_index: 0.04, cultural_elite_index: 0.02 }),
  luxury('Mercury', { intellectual_index: 0.04, extractive_index: 0.02 }),
  luxury('Olives', { agrarian_index: 0.03, commercial_index: 0.02 }),
  luxury('Pearls', { spiritual_index: 0.03, maritime_index: 0.03 }),
  luxury('Perfume', { commercial_index: 0.04, urban_index: 0.02 }),
  luxury('Salt', { extractive_index: 0.03, commercial_index: 0.03 }),
  luxury('Silk', { cultural_elite_index: 0.03, commercial_index: 0.03 }),
  luxury('Silver', { commercial_index: 0.05, extractive_index: 0.02 }),
  luxury('Spices', { commercial_index: 0.04, agrarian_index: 0.02 }),
  luxury('Sugar', { agrarian_index: 0.04, commercial_index: 0.02 }),
  luxury('Tea', { intellectual_index: 0.03, agrarian_index: 0.02 }),
  luxury('Tobacco', { spiritual_index: 0.03, agrarian_index: 0.02 }),
  luxury('Toys', { commercial_index: 0.04, urban_index: 0.02 }),
  luxury('Truffles', { wilderness_index: 0.03, commercial_index: 0.03 }),
  luxury('Turtles', { intellectual_index: 0.03, maritime_index: 0.02 }),
  luxury('Whales', { maritime_index: 0.05, extractive_index: 0.03 }),
  luxury('Wine', { leisure_tourism_index: 0.03, agrarian_index: 0.02, commercial_index: 0.02 }),
  // Civ 5 names some older saves use; still scored, never suggested.
  luxury('Gems', { extractive_index: 0.04, commercial_index: 0.04 }, { hidden: true }),
  luxury('Gold', { commercial_index: 0.05, extractive_index: 0.02 }, { hidden: true }),

  // Horses are pastured, not mined, so they lean military/rural instead of
  // counting as a strategic mineral.
  strategic('Horses', { lean: { military_index: 0.08, rural_index: 0.03, agrarian_index: 0.02 } }),
  strategic('Iron', { signals: { strategic_resource: 1 } }),
  strategic('Niter', { signals: { strategic_resource: 1, energy_resource: 1 } }),
  strategic('Coal', { signals: { strategic_resource: 1, energy_resource: 1 } }),
  strategic('Oil', { signals: { strategic_resource: 1, energy_resource: 1 } }),
  strategic('Aluminum', { aliases: ['Aluminium'], signals: { strategic_resource: 1, energy_resource: 1 } }),
  strategic('Uranium', { signals: { strategic_resource: 1, energy_resource: 1 } }),
]
