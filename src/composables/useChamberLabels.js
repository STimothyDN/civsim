import { computed } from 'vue'
import { useCivilizationStore } from '../stores/civilizationStore'
import {
  lowerHouseName as baseLowerHouseName,
  upperHouseName as baseUpperHouseName,
  lowerHouseLeaderTitle as baseLowerHouseLeaderTitle,
  upperHouseLeaderTitle as baseUpperHouseLeaderTitle,
  lowerHouseMemberTitle as baseLowerHouseMemberTitle,
  upperHouseMemberTitle as baseUpperHouseMemberTitle,
} from '../domain/elections/chambers/names'

/**
 * Reactive chamber/leader naming bound to the live config. Drop-in replacement
 * for the raw domain functions: same names and call signatures, but they read
 * the user-configured chamber names. Because they read the reactive `chambers`
 * getter during render, label edits update the UI instantly.
 */
export function useChamberLabels() {
  const civStore = useCivilizationStore()
  const chambers = computed(() => civStore.chambers)
  return {
    lowerHouseName: (level, placeName = '') => baseLowerHouseName(level, placeName, chambers.value),
    upperHouseName: (level, placeName = '') => baseUpperHouseName(level, placeName, chambers.value),
    lowerHouseLeaderTitle: (level) => baseLowerHouseLeaderTitle(level, chambers.value),
    upperHouseLeaderTitle: (level) => baseUpperHouseLeaderTitle(level, chambers.value),
    lowerHouseMemberTitle: (plural = false) => baseLowerHouseMemberTitle(plural, chambers.value),
    upperHouseMemberTitle: (plural = false) => baseUpperHouseMemberTitle(plural, chambers.value),
    // Member title by engine chamber key ('assembly' = lower, 'prelates' = upper).
    memberTitle: (chamberType, plural = false) => (chamberType === 'prelates'
      ? baseUpperHouseMemberTitle(plural, chambers.value)
      : baseLowerHouseMemberTitle(plural, chambers.value)),
  }
}
