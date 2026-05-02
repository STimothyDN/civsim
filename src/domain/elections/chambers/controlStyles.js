import { PARTY_META } from '../constants/parties'

const FALLBACK_COLOR = '#d4a843'

export function controlStyleVars(control, prefix = 'winner', partyMeta = PARTY_META) {
  const color = partyMeta[control?.leaderParty]?.color || FALLBACK_COLOR
  const isMinority = control?.status === 'minority-government'
  const isEmpty = !control || control.status === 'empty'
  const baseColor = isEmpty ? 'var(--accent)' : color
  const background = isEmpty ? 'rgba(212, 168, 67, 0.08)' : `${color}${isMinority ? '12' : '22'}`
  const border = isEmpty ? 'rgba(212, 168, 67, 0.24)' : `${color}${isMinority ? '44' : '77'}`

  return {
    [`--${prefix}-color`]: baseColor,
    [`--${prefix}-bg`]: background,
    [`--${prefix}-border`]: border,
  }
}

export function winnerControlStyle(control, partyMeta = PARTY_META) {
  return controlStyleVars(control, 'winner', partyMeta)
}

export function chamberControlStyle(control, partyMeta = PARTY_META) {
  return controlStyleVars(control, 'control', partyMeta)
}
