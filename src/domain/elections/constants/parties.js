export const PARTIES = ['yellow', 'orange', 'red', 'blue', 'white', 'purple']

export const PARTY_NAMES = {
  yellow: 'Divinus Sol',
  orange: 'United Workers Congress',
  red: 'The National Drumbeat',
  blue: 'Coalition of the Free',
  white: 'Solidarity Americana',
  purple: 'Lotus Restorationists',
}

export const PARTY_COLORS = {
  yellow: '#d4a843',
  orange: '#fb923c',
  red: '#ef4444',
  blue: '#60a5fa',
  white: '#f8fafc',
  purple: '#a78bfa',
}

export const PARTY_META = {
  yellow: {
    name: PARTY_NAMES.yellow,
    colorKey: 'yellow',
    color: PARTY_COLORS.yellow,
    ideology: 'Imperial centralist, enlightened elite, state-development party',
  },
  orange: {
    name: PARTY_NAMES.orange,
    colorKey: 'orange',
    color: PARTY_COLORS.orange,
    ideology: 'Labor, industrial workers, organized production, urban economic justice',
  },
  red: {
    name: PARTY_NAMES.red,
    colorKey: 'red',
    color: PARTY_COLORS.red,
    ideology: 'Rural, military, socially conservative, patriotic traditionalist',
  },
  blue: {
    name: PARTY_NAMES.blue,
    colorKey: 'blue',
    color: PARTY_COLORS.blue,
    ideology: 'Civic middle class, intellectuals, spiritual reformers, decentralists',
  },
  white: {
    name: PARTY_NAMES.white,
    colorKey: 'white',
    color: PARTY_COLORS.white,
    ideology: 'American provincial interest, autonomy bloc, regional-interest party',
  },
  purple: {
    name: PARTY_NAMES.purple,
    colorKey: 'purple',
    color: PARTY_COLORS.purple,
    ideology: 'Taoist interest, religious-cultural minority, Roman royal restorationism',
  },
}

export const DEFAULT_PARTY_CONFIG = Object.fromEntries(
  PARTIES.map((party) => [
    party,
    {
      name: PARTY_NAMES[party],
      color: PARTY_COLORS[party],
    },
  ])
)

function sanitizeColor(value, fallback) {
  const color = String(value || '').trim()
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback
}

export function normalizePartyConfig(value = {}) {
  return Object.fromEntries(
    PARTIES.map((party) => {
      const source = value?.[party] || {}
      return [
        party,
        {
          name: String(source.name || PARTY_NAMES[party]).trim() || PARTY_NAMES[party],
          color: sanitizeColor(source.color, PARTY_COLORS[party]),
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
  yellow: 0.08,
  orange: 0.08,
  red: 0.08,
  blue: 0.08,
  white: 0.015,
  purple: 0.015,
}
