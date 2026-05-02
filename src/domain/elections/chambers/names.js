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

