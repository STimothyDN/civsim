export const PARTIES = ['yellow', 'orange', 'red', 'blue', 'white', 'purple', 'green']

export const PARTY_NAMES = {
  yellow: 'Divinus Sol',
  orange: 'United Workers Congress',
  red: 'The National Drumbeat',
  blue: 'Coalition of the Free',
  white: 'Solidarity Americana',
  purple: 'Lotus Restorationists',
  green: 'Green Party',
}

export const PARTY_COLORS = {
  yellow: '#d4a843',
  orange: '#fb923c',
  red: '#ef4444',
  blue: '#60a5fa',
  white: '#f8fafc',
  purple: '#a78bfa',
  green: '#22c55e',
}

export const PARTY_COLOR_PALETTE = [
  { name: 'Yellow', color: '#d4a843' },
  { name: 'Orange', color: '#fb923c' },
  { name: 'Red', color: '#ef4444' },
  { name: 'Blue', color: '#60a5fa' },
  { name: 'White', color: '#f8fafc' },
  { name: 'Purple', color: '#a78bfa' },
  { name: 'Teal', color: '#2dd4bf' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Rose', color: '#fb7185' },
  { name: 'Slate', color: '#94a3b8' },
]

export const PARTY_COLOR_NAMES = {
  yellow: 'Yellow',
  orange: 'Orange',
  red: 'Red',
  blue: 'Blue',
  white: 'White',
  purple: 'Purple',
  green: 'Green',
}

export const PARTY_ABBREVIATIONS = {
  yellow: 'DS',
  orange: 'UWC',
  red: 'ND',
  blue: 'CF',
  white: 'SA',
  purple: 'LR',
  green: 'GP',
}

export const PARTY_META = {
  yellow: {
    name: PARTY_NAMES.yellow,
    abbreviation: PARTY_ABBREVIATIONS.yellow,
    colorName: PARTY_COLOR_NAMES.yellow,
    colorKey: 'yellow',
    color: PARTY_COLORS.yellow,
    ideology: 'Imperial centralist, enlightened elite, state-development party',
  },
  orange: {
    name: PARTY_NAMES.orange,
    abbreviation: PARTY_ABBREVIATIONS.orange,
    colorName: PARTY_COLOR_NAMES.orange,
    colorKey: 'orange',
    color: PARTY_COLORS.orange,
    ideology: 'Labor, industrial workers, organized production, urban economic justice',
  },
  red: {
    name: PARTY_NAMES.red,
    abbreviation: PARTY_ABBREVIATIONS.red,
    colorName: PARTY_COLOR_NAMES.red,
    colorKey: 'red',
    color: PARTY_COLORS.red,
    ideology: 'Rural, military, socially conservative, patriotic traditionalist',
  },
  blue: {
    name: PARTY_NAMES.blue,
    abbreviation: PARTY_ABBREVIATIONS.blue,
    colorName: PARTY_COLOR_NAMES.blue,
    colorKey: 'blue',
    color: PARTY_COLORS.blue,
    ideology: 'Civic middle class, intellectuals, spiritual reformers, decentralists',
  },
  white: {
    name: PARTY_NAMES.white,
    abbreviation: PARTY_ABBREVIATIONS.white,
    colorName: PARTY_COLOR_NAMES.white,
    colorKey: 'white',
    color: PARTY_COLORS.white,
    ideology: 'American provincial interest, autonomy bloc, regional-interest party',
  },
  purple: {
    name: PARTY_NAMES.purple,
    abbreviation: PARTY_ABBREVIATIONS.purple,
    colorName: PARTY_COLOR_NAMES.purple,
    colorKey: 'purple',
    color: PARTY_COLORS.purple,
    ideology: 'Taoist interest, religious-cultural minority, Roman royal restorationism',
  },
  green: {
    name: PARTY_NAMES.green,
    abbreviation: PARTY_ABBREVIATIONS.green,
    colorName: PARTY_COLOR_NAMES.green,
    colorKey: 'green',
    color: PARTY_COLORS.green,
    ideology: 'Environmental conservation, natural preservation, ecological sustainability',
  },
}

export const DEFAULT_PARTY_CONFIG = Object.fromEntries(
  PARTIES.map((party) => [
    party,
    {
      name: PARTY_NAMES[party],
      abbreviation: PARTY_ABBREVIATIONS[party],
      colorName: PARTY_COLOR_NAMES[party],
      color: PARTY_COLORS[party],
    },
  ])
)

function sanitizeColor(value) {
  const color = String(value || '').trim()
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : ''
}

function paletteOptionForValue(value, fallbackName = 'Yellow') {
  const text = String(value || '').trim()
  const lowered = text.toLowerCase()
  const byName = PARTY_COLOR_PALETTE.find((option) => option.name.toLowerCase() === lowered)
  if (byName) return byName

  const color = sanitizeColor(text)
  const byColor = PARTY_COLOR_PALETTE.find((option) => option.color.toLowerCase() === color)
  if (byColor) return byColor

  return PARTY_COLOR_PALETTE.find((option) => option.name === fallbackName) || PARTY_COLOR_PALETTE[0]
}

export function partyPaletteOption(value, fallbackName = 'Yellow') {
  return paletteOptionForValue(value, fallbackName)
}

function sanitizeAbbreviation(value, fallback) {
  const text = String(value || '').trim().toUpperCase().replace(/\s+/g, '')
  return text.slice(0, 8) || fallback
}

export function normalizePartyConfig(value = {}) {
  return Object.fromEntries(
    PARTIES.map((party) => {
      const source = value?.[party] || {}
      const colorOption = paletteOptionForValue(source.colorName || source.color, PARTY_COLOR_NAMES[party])
      return [
        party,
        {
          name: String(source.name || PARTY_NAMES[party]).trim() || PARTY_NAMES[party],
          abbreviation: sanitizeAbbreviation(source.abbreviation || source.shortName, PARTY_ABBREVIATIONS[party]),
          colorName: colorOption.name,
          color: colorOption.color,
        },
      ]
    })
  )
}

export function partyMetaFromConfig(value = {}) {
  const config = normalizePartyConfig(value)
  return Object.fromEntries(
    PARTIES.map((party) => [
      party,
      {
        ...PARTY_META[party],
        name: config[party].name,
        abbreviation: config[party].abbreviation,
        colorName: config[party].colorName,
        colorLabel: `${config[party].colorName} Party`,
        color: config[party].color,
      },
    ])
  )
}

export function partyNamesFromConfig(value = {}) {
  const meta = partyMetaFromConfig(value)
  return Object.fromEntries(PARTIES.map((party) => [party, meta[party].name]))
}

export function partyColorsFromConfig(value = {}) {
  const meta = partyMetaFromConfig(value)
  return Object.fromEntries(PARTIES.map((party) => [party, meta[party].color]))
}

export const PARTY_FLOORS = {
  yellow: 0.07,
  orange: 0.08,
  red: 0.08,
  blue: 0.08,
  white: 0.008,
  purple: 0.008,
  green: 0.005,
}
