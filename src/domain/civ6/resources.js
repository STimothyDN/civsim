/**
 * Civ 6 resources — the county `resource` field. Entry fields are described in
 * terrains.js. A resource on an unimproved tile counts at half strength (see
 * elections/features/countyProfile.js): an untapped deposit shapes local life
 * less than a worked one.
 */

const bonus = (name, profile, props = {}) => ({ name, kind: 'Bonus resource', profile, ...props })
const luxury = (name, profile, props = {}) => ({ name, kind: 'Luxury resource', profile, ...props })
const strategic = (name, profile, props = {}) => ({ name, kind: 'Strategic resource', profile, ...props })

export const RESOURCES = [
  // Staples: what a farm, pasture, camp, quarry or boat works.
  bonus('Bananas', { agrarian: 0.4, ecology: 0.1 }),
  bonus('Cattle', { agrarian: 0.45, rural: 0.3 }),
  bonus('Copper', { extractive: 0.5, worker: 0.25, commercial: 0.15 }),
  bonus('Crabs', { maritime: 0.5, commercial: 0.2 }),
  bonus('Deer', { rural: 0.3, wilderness: 0.3, extractive: 0.2 }),
  bonus('Fish', { maritime: 0.55, agrarian: 0.1 }),
  bonus('Maize', { agrarian: 0.5, commercial: 0.1 }),
  bonus('Rice', { agrarian: 0.55, watershed: 0.2 }),
  bonus('Sheep', { agrarian: 0.4, rural: 0.35 }),
  bonus('Stone', { extractive: 0.45, worker: 0.2, civic: 0.1 }),
  bonus('Wheat', { agrarian: 0.55 }),

  // Luxuries: all are trade goods; each also reads as where it comes from.
  luxury('Amber', { commercial: 0.3, extractive: 0.3, cultural: 0.2 }),
  luxury('Cinnamon', { commercial: 0.5, agrarian: 0.2 }),
  luxury('Citrus', { agrarian: 0.4, commercial: 0.3 }),
  luxury('Cloves', { commercial: 0.5, agrarian: 0.2 }),
  luxury('Cocoa', { commercial: 0.4, agrarian: 0.35, worker: 0.1 }),
  luxury('Coffee', { commercial: 0.35, agrarian: 0.35, cultural: 0.2 }),
  luxury('Cosmetics', { commercial: 0.6, urban: 0.2, middle_class: 0.2 }),
  luxury('Cotton', { agrarian: 0.35, commercial: 0.3, worker: 0.25, industrial: 0.1 }),
  luxury('Diamonds', { extractive: 0.5, commercial: 0.5, worker: 0.2 }),
  luxury('Dyes', { commercial: 0.3, agrarian: 0.3, spiritual: 0.25 }),
  luxury('Furs', { commercial: 0.35, wilderness: 0.35, rural: 0.2 }),
  luxury('Gypsum', { extractive: 0.45, commercial: 0.3, worker: 0.2 }),
  luxury('Honey', { agrarian: 0.4, rural: 0.2, commercial: 0.2 }),
  luxury('Incense', { spiritual: 0.45, commercial: 0.3, agrarian: 0.2 }),
  luxury('Ivory', { commercial: 0.4, wilderness: 0.3, extractive: 0.2 }),
  luxury('Jade', { extractive: 0.35, cultural: 0.35, commercial: 0.3 }),
  luxury('Jeans', { commercial: 0.5, industrial: 0.3, worker: 0.2 }),
  luxury('Marble', { extractive: 0.4, civic: 0.3, cultural: 0.2, commercial: 0.2 }),
  luxury('Mercury', { extractive: 0.4, intellectual: 0.35, pollution: 0.2 }),
  luxury('Olives', { agrarian: 0.4, commercial: 0.3 }),
  luxury('Pearls', { maritime: 0.4, spiritual: 0.3, commercial: 0.3 }),
  luxury('Perfume', { commercial: 0.55, middle_class: 0.25, cultural: 0.2 }),
  luxury('Salt', { extractive: 0.4, commercial: 0.35, agrarian: 0.1 }),
  luxury('Silk', { commercial: 0.4, agrarian: 0.3, cultural: 0.3 }),
  luxury('Silver', { commercial: 0.5, extractive: 0.45 }),
  luxury('Spices', { commercial: 0.45, agrarian: 0.35 }),
  luxury('Sugar', { agrarian: 0.45, commercial: 0.3, worker: 0.2 }),
  luxury('Tea', { agrarian: 0.35, commercial: 0.3, intellectual: 0.2 }),
  luxury('Tobacco', { agrarian: 0.35, commercial: 0.3, spiritual: 0.2 }),
  luxury('Toys', { commercial: 0.5, industrial: 0.25, middle_class: 0.2 }),
  luxury('Truffles', { commercial: 0.45, wilderness: 0.3, rural: 0.2 }),
  luxury('Turtles', { ecology: 0.5, maritime: 0.35, intellectual: 0.2 }),
  luxury('Whales', { maritime: 0.6, extractive: 0.3, commercial: 0.2 }),
  luxury('Wine', { agrarian: 0.4, commercial: 0.4, leisure: 0.25 }),
  // Civ 5 names some older saves use; still scored, never suggested.
  luxury('Gems', { extractive: 0.5, commercial: 0.5, worker: 0.2 }, { hidden: true }),
  luxury('Gold', { commercial: 0.55, extractive: 0.45 }, { hidden: true }),

  // Strategic: what armies and industry are built from.
  strategic('Horses', { military: 0.45, rural: 0.3, agrarian: 0.2 }),
  strategic('Iron', { extractive: 0.55, military: 0.35, worker: 0.25, industrial: 0.2 }),
  strategic('Niter', { extractive: 0.45, military: 0.4, industrial: 0.2 }),
  strategic('Coal', { extractive: 0.6, industrial: 0.45, worker: 0.35, pollution: 0.4 }),
  strategic('Oil', { extractive: 0.6, industrial: 0.4, worker: 0.3, pollution: 0.45 }),
  strategic('Aluminum', { extractive: 0.5, industrial: 0.45, intellectual: 0.15 }, { aliases: ['Aluminium'] }),
  strategic('Uranium', { extractive: 0.5, industrial: 0.35, military: 0.35, pollution: 0.3, intellectual: 0.15 }),
]
