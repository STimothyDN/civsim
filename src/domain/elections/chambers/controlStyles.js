import { PARTY_META } from '../constants/parties'

const FALLBACK_COLOR = '#d4a843'

export function controlStyleVars(control, prefix = 'winner') {
  const color = PARTY_META[control?.leaderParty]?.color || FALLBACK_COLOR
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

export function winnerControlStyle(control) {
  return controlStyleVars(control, 'winner')
}

export function chamberControlStyle(control) {
  return controlStyleVars(control, 'control')
}
