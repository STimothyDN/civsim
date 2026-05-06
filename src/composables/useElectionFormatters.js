import { winnerControlStyle } from '../domain/elections'
import { partyWinnerStyle } from '../domain/elections/viewHelpers'

/**
 * Shared formatting functions used across all election pages.
 *
 * Eliminates ~30 lines of duplicated helper functions that were
 * copy-pasted into ElectionOverview, NationalElectionResults,
 * RegionalElectionResults, and ProvincialElectionResults.
 *
 * @param {Object} store - The formStore instance (for `partyMeta`).
 */
export function useElectionFormatters(store) {
  /**
   * Oxford-comma list formatter.
   * @param {string[]} items
   * @returns {string}
   */
  function formatListWithOxfordComma(items) {
    if (items.length === 0) return ''
    if (items.length === 1) return items[0]
    if (items.length === 2) return `${items[0]} and ${items[1]}`
    return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
  }

  /**
   * Format a support party with its color for inline HTML rendering.
   * @param {{ name: string, color: string, seatCount: number }} party
   * @returns {string}
   */
  function formatSupportPartyWithColor(party) {
    return `<span style="color: ${party.color}">${party.name}</span> (${party.seatCount})`
  }

  /**
   * Format a support leader with party color for inline HTML rendering.
   * @param {{ party: string, name: string, title: string, jurisdiction: string }} leader
   * @returns {string}
   */
  function formatSupportLeaderWithColor(leader) {
    const partyColor = store.partyMeta[leader.party]?.color || '#d4a843'
    return `${leader.title} <span style="color: ${partyColor}">${leader.name}</span> from ${leader.jurisdiction} (<span style="color: ${partyColor}">${store.partyMeta[leader.party]?.abbreviation || leader.party}</span>)`
  }

  /**
   * Build inline CSS custom properties for a winner control card.
   * @param {Object} control
   * @returns {Object}
   */
  function controlCardStyle(control) {
    return winnerControlStyle(control, store.partyMeta)
  }

  /**
   * Build inline CSS custom properties for a party-winner element.
   * @param {string} party
   * @returns {Object}
   */
  function partyStyle(party) {
    return partyWinnerStyle(party, store.partyMeta)
  }

  return {
    controlCardStyle,
    formatListWithOxfordComma,
    formatSupportLeaderWithColor,
    formatSupportPartyWithColor,
    partyStyle,
  }
}
