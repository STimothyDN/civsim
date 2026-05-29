import { DEFAULT_PARTIES } from './defaultParties'
import { DEFAULT_VOTER_BLOCS } from './defaultVoterBlocs'
import { DEFAULT_NAMING } from '../representativeNames'
import { deepClone } from '../../../utils/object'

/**
 * Default chamber & leader naming. Region/province names use a "{place}" token.
 * Mirrors the original chambers/names.js strings.
 */
export const DEFAULT_CHAMBERS = {
  lower: {
    nationalName: 'Assembly of the Empire',
    regionalTemplate: 'Assembly of {place}',
    provincialTemplate: 'Assembly of {place}',
    leaderTitles: { national: 'Prime Minister', regional: 'Premier', provincial: 'Governor' },
  },
  upper: {
    nationalName: 'Council of Prelates',
    regionalTemplate: 'Council of Prelates of {place}',
    provincialTemplate: 'Council of Prelates of {place}',
    leaderTitles: { national: 'Principal Chancellor', regional: 'Head Chancellor', provincial: 'Chancellor' },
  },
}

/**
 * Default calculation parameters. Mirrors utils/calculatedFields.js magic
 * numbers so behavior is unchanged unless the user tweaks them in Advanced Setup.
 */
export const DEFAULT_CALCULATIONS = {
  provincialPopulation: {
    popDivisor: 4,
    popPower: 2.1,
    scale: 0.25,
    baseMultiplier: 350000,
    jitterRange: 7500,
    exponentBase: 1.08,
    exponentJitter: 0.025,
  },
  prelateTiers: [
    { min: 45000000, seats: 11 },
    { min: 37500000, seats: 10 },
    { min: 30000000, seats: 9 },
    { min: 22500000, seats: 8 },
    { min: 15000000, seats: 7 },
    { min: 7500000, seats: 6 },
    { min: 0, seats: 5 },
  ],
  electionYear: { base: 2026, increment: 2 },
}

/**
 * Default election rules. Mirrors constants/apportionmentRules.js.
 */
export const DEFAULT_ELECTION_RULES = {
  apportionment: {
    provincialAssembly: 'dhondt',
    provincialPrelates: 'modifiedSainteLague',
    nationalAssembly: 'sainteLague',
    nationalPrelates: 'provinceByProvinceDhondt',
  },
  thresholds: {
    provincialAssembly: 0,
    provincialPrelates: 0,
    nationalAssembly: 0,
    nationalPrelates: 0,
  },
  volatility: { national: 0.05, region: 0.08, province: 0.12, county: 0.20 },
  voteBlend: { provincialAssemblyLocalWeight: 0.65, nationalAssemblyLocalWeight: 0.7 },
}

/** A fresh, deep-cloned default config block for a new template. */
export function createDefaultConfig() {
  return {
    parties: deepClone(DEFAULT_PARTIES),
    voterBlocs: deepClone(DEFAULT_VOTER_BLOCS),
    chambers: deepClone(DEFAULT_CHAMBERS),
    calculations: deepClone(DEFAULT_CALCULATIONS),
    elections: deepClone(DEFAULT_ELECTION_RULES),
    naming: deepClone(DEFAULT_NAMING),
  }
}

export { DEFAULT_NAMING }
