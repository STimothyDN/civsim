/**
 * Seat index offsets used to namespace representative name keys
 * across scope/chamber combinations.
 *
 * Keys in electionStore.representativeNames use the format:
 *   `{party}_{seatIndex + offset}`
 *
 * National Assembly:    0
 * National Prelates:  2500
 * Regional Assembly:  5000
 * Regional Prelates:  7500
 * Provincial Assembly: 10000
 * Provincial Prelates: 12500
 */
export const SEAT_OFFSETS = {
  national:   { assembly: 0,     prelates: 2500  },
  regional:   { assembly: 5000,  prelates: 7500  },
  provincial: { assembly: 10000, prelates: 12500 },
}

/**
 * Returns the seat index offset for a given scope and chamber type.
 * Returns 0 for unrecognized combinations.
 *
 * @param {'national'|'regional'|'provincial'} scope
 * @param {'assembly'|'prelates'} chamberType
 * @returns {number}
 */
export function getSeatOffset(scope, chamberType) {
  return SEAT_OFFSETS[scope]?.[chamberType] ?? 0
}
