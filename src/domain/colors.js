export const GROUP_PALETTE = [
  '#d4a843',
  '#60a5fa',
  '#34d399',
  '#f472b6',
  '#a78bfa',
  '#fb923c',
  '#2dd4bf',
  '#e879f9',
  '#facc15',
  '#38bdf8',
]

export function colorForIndex(index) {
  return GROUP_PALETTE[index % GROUP_PALETTE.length]
}

export function groupColor(groups, name) {
  const index = Array.isArray(groups) ? groups.indexOf(name) : -1
  return colorForIndex(index < 0 ? 0 : index)
}
