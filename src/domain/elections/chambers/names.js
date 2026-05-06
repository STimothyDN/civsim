export function lowerHouseName(level, placeName = '') {
  if (level === 'national') return 'Assembly of the Empire'
  const name = placeName || (level === 'regional' ? 'the Region' : 'the Province')
  return `Assembly of ${name}`
}

export function upperHouseName(level, placeName = '') {
  if (level === 'national') return 'Council of Prelates'
  const name = placeName || (level === 'regional' ? 'the Region' : 'the Province')
  return `Council of Prelates of ${name}`
}

export function lowerHouseLeaderTitle(level) {
  switch (level) {
    case 'national': return 'Prime Minister'
    case 'regional': return 'Premier'
    case 'provincial': return 'Governor'
    default: return 'Assembly Leader'
  }
}

export function upperHouseLeaderTitle(level) {
  switch (level) {
    case 'national': return 'Principal Chancellor'
    case 'regional': return 'Head Chancellor'
    case 'provincial': return 'Chancellor'
    default: return 'Council Leader'
  }
}

