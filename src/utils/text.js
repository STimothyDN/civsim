export function humanize(text) {
  if (!text && text !== 0) return ''
  return String(text)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function getSingularLabel(label) {
  const special = {
    Provinces: 'Province',
    Religions: 'Religion',
    Counties: 'County',
    Cities: 'City',
  }
  if (special[label]) return special[label]
  if (label.endsWith('ies')) return label.slice(0, -3) + 'y'
  if (label.endsWith('s')) return label.slice(0, -1)
  return label
}
