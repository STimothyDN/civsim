/**
 * Standalone number and percentage formatting utilities.
 *
 * These helpers were originally embedded in provinceVisualizations.js.
 * Extracting them lets formatters be imported without pulling in the
 * full charting/visualization module.
 */

/**
 * Coerce any value to a finite number. Returns 0 for null, undefined,
 * empty strings, NaN, and Infinity.
 *
 * @param {*} value
 * @returns {number}
 */
export function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

/**
 * Locale-formatted number with up to 1 decimal place.
 *
 * @param {*} value
 * @returns {string}
 */
export function formatNumber(value) {
  return toNumber(value).toLocaleString(undefined, { maximumFractionDigits: 1 })
}

/**
 * Compact locale-formatted number (e.g. 1.2M, 450K).
 *
 * @param {*} value
 * @returns {string}
 */
export function formatCompactNumber(value) {
  return toNumber(value).toLocaleString(undefined, {
    maximumFractionDigits: 1,
    notation: 'compact',
  })
}

/**
 * Format a value as a percentage string.
 *
 * @param {*} value - raw number (not 0-1 fraction; e.g. 72 → "72%")
 * @returns {string}
 */
export function formatPercent(value) {
  return `${formatNumber(value)}%`
}
