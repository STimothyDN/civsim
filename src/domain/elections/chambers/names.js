import { DEFAULT_CHAMBERS } from '../constants/defaultConfig'

function fillPlace(template, placeName, fallbackPlace) {
  const place = placeName || fallbackPlace
  return String(template || '').replace(/\{place\}/g, place)
}

export function lowerHouseName(level, placeName = '', chambers = DEFAULT_CHAMBERS) {
  const cfg = chambers?.lower || DEFAULT_CHAMBERS.lower
  if (level === 'national') return cfg.nationalName
  const fallback = level === 'regional' ? 'the Region' : 'the Province'
  const template = level === 'regional' ? cfg.regionalTemplate : cfg.provincialTemplate
  return fillPlace(template, placeName, fallback)
}

export function upperHouseName(level, placeName = '', chambers = DEFAULT_CHAMBERS) {
  const cfg = chambers?.upper || DEFAULT_CHAMBERS.upper
  if (level === 'national') return cfg.nationalName
  const fallback = level === 'regional' ? 'the Region' : 'the Province'
  const template = level === 'regional' ? cfg.regionalTemplate : cfg.provincialTemplate
  return fillPlace(template, placeName, fallback)
}

export function lowerHouseLeaderTitle(level, chambers = DEFAULT_CHAMBERS) {
  const titles = chambers?.lower?.leaderTitles || DEFAULT_CHAMBERS.lower.leaderTitles
  return titles[level] || DEFAULT_CHAMBERS.lower.leaderTitles[level] || 'Assembly Leader'
}

export function upperHouseLeaderTitle(level, chambers = DEFAULT_CHAMBERS) {
  const titles = chambers?.upper?.leaderTitles || DEFAULT_CHAMBERS.upper.leaderTitles
  return titles[level] || DEFAULT_CHAMBERS.upper.leaderTitles[level] || 'Council Leader'
}
