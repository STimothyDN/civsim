/**
 * Seat-dot grid column spacing only — congress hemicycle uses uniform angular spacing along each arc.
 */
export const GRID_SEAT_HORIZONTAL_GAP = 16

/** @deprecated Use GRID_SEAT_HORIZONTAL_GAP — kept for any external imports */
export const HEMICYCLE_HORIZONTAL_PITCH = GRID_SEAT_HORIZONTAL_GAP

/** Layout constants (SVG user space — zoom scales the whole SVG). */
export const PARLIAMENT_SVG_WIDTH = 720

/**
 * Fixed “window” for every chamber card (congress + seat grid).
 */
export const CHAMBER_VIZ_VIEWBOX = '0 0 720 400'

const VIZ_HEIGHT = 400
const GRID_BODY_HEIGHT = 300
const TWO_PI = Math.PI * 2

/** Rounder arc — ellipse vertical scale */
const HEMI_Y_SCALE = { normal: 0.84, compact: 0.8 }

const HEMI_CENTER_Y = { normal: 338, compact: 324 }

/** Angular inset from π and 2π so dots stay inside the frame */
const ARC_INSET = { normal: 0.085, compact: 0.09 }

/**
 * Max concentric arcs — angular packing needs enough rows for huge chambers.
 */
const MAX_ROWS = { normal: 68, compact: 58 }

function overlapEpsilon(compact) {
  return compact ? 0.2 : 0.26
}

function arcThetaExtents(compact) {
  const inset = compact ? ARC_INSET.compact : ARC_INSET.normal
  return {
    thetaMin: Math.PI + inset,
    thetaMax: TWO_PI - inset,
  }
}

function hemiXY(theta, rad, compact) {
  const yScale = compact ? HEMI_Y_SCALE.compact : HEMI_Y_SCALE.normal
  const cx = PARLIAMENT_SVG_WIDTH / 2
  const cy = compact ? HEMI_CENTER_Y.compact : HEMI_CENTER_Y.normal
  return {
    x: cx + Math.cos(theta) * rad,
    y: cy + Math.sin(theta) * rad * yScale,
  }
}

/**
 * Seat centers placed at equal arc length along the elliptical arc (not equal Δθ).
 * Reads as even spacing along the curve; shape need not be a perfect circle.
 */
function arcSeatPositions(count, rad, compact, dotR) {
  if (count <= 0) return []
  const { thetaMin, thetaMax } = arcThetaExtents(compact)
  if (count === 1) {
    const th = (thetaMin + thetaMax) / 2
    const { x, y } = hemiXY(th, rad, compact)
    return [{ x, y, r: dotR }]
  }

  const samples = 640
  const dTheta = (thetaMax - thetaMin) / samples
  const cumLen = [0]
  let { x: px, y: py } = hemiXY(thetaMin, rad, compact)
  for (let s = 1; s <= samples; s += 1) {
    const th = thetaMin + s * dTheta
    const { x, y } = hemiXY(th, rad, compact)
    cumLen.push(cumLen[cumLen.length - 1] + Math.hypot(x - px, y - py))
    px = x
    py = y
  }

  const totalLen = cumLen[cumLen.length - 1]
  const targets = Array.from({ length: count }, (_, i) => ((i + 0.5) / count) * totalLen)

  return targets.map((goal) => {
    let lo = 0
    let hi = samples
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2)
      if (cumLen[mid] < goal) lo = mid + 1
      else hi = mid
    }
    const idx = Math.min(samples - 1, Math.max(1, lo))
    const len0 = cumLen[idx - 1]
    const len1 = cumLen[idx]
    const tfrac = len1 > len0 ? (goal - len0) / (len1 - len0) : 0
    const theta = thetaMin + ((idx - 1 + tfrac) / samples) * (thetaMax - thetaMin)
    const { x, y } = hemiXY(theta, rad, compact)
    return { x, y, r: dotR }
  })
}

/** Minimum chord length between consecutive seats along one angular arc */
function minNeighborChordOnArc(count, rad, compact, dotR) {
  if (count < 2) return Infinity
  const pts = arcSeatPositions(count, rad, compact, dotR)
  let m = Infinity
  for (let i = 0; i < count - 1; i += 1) {
    const dx = pts[i + 1].x - pts[i].x
    const dy = pts[i + 1].y - pts[i].y
    m = Math.min(m, Math.hypot(dx, dy))
  }
  return m
}

/**
 * Largest n such that consecutive angular neighbors stay separated for this radius row.
 */
function maxSeatsOnAngularArc(R, compact, dotR) {
  const eps = overlapEpsilon(compact)
  const need = 2 * dotR + eps
  let lo = 1
  let hi = 900
  let best = 1
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    const chord = minNeighborChordOnArc(mid, R, compact, dotR)
    if (mid >= 2 && chord < need) {
      hi = mid - 1
    } else {
      best = mid
      lo = mid + 1
    }
  }
  return Math.max(1, best)
}

function initialWeightedRowSplits(totalSeats, rowCount) {
  if (rowCount <= 0) return []
  const weights = Array.from({ length: rowCount }, (_, index) => index + 1)
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  const counts = weights.map((w) => Math.floor(totalSeats * w / totalWeight))
  let missing = totalSeats - counts.reduce((a, b) => a + b, 0)
  const order = weights
    .map((w, i) => ({
      i,
      rem: (totalSeats * w / totalWeight) - counts[i],
    }))
    .sort((a, b) => b.rem - a.rem || b.i - a.i)
  for (const { i } of order) {
    if (missing <= 0) break
    counts[i] += 1
    missing -= 1
  }
  return counts
}

function rowRadii(compact, rowCount) {
  const rowMax = Math.max(1, rowCount - 1)
  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const rowRatio = rowMax ? rowIndex / rowMax : 1
    return (compact ? 86 : 92) + rowRatio * (compact ? 198 : 220)
  })
}

function rebalanceAcrossCaps(counts, caps) {
  const n = counts.length
  for (let iter = 0; iter < 3000; iter += 1) {
    let over = -1
    for (let k = 0; k < n; k += 1) {
      if (counts[k] > caps[k]) {
        over = k
        break
      }
    }
    if (over === -1) return true

    let moved = false
    const tryOrder = []
    for (let d = 1; d < n; d += 1) {
      tryOrder.push(over + d, over - d)
    }
    for (const t of tryOrder) {
      if (t < 0 || t >= n) continue
      if (counts[t] < caps[t]) {
        counts[over] -= 1
        counts[t] += 1
        moved = true
        break
      }
    }
    if (!moved) return false
  }
  return false
}

function waterfillCounts(totalSeats, caps) {
  const n = caps.length
  const counts = Array(n).fill(0)
  let left = totalSeats
  while (left > 0) {
    let placed = false
    for (let k = n - 1; k >= 0 && left > 0; k -= 1) {
      if (counts[k] < caps[k]) {
        counts[k] += 1
        left -= 1
        placed = true
      }
    }
    if (!placed) break
  }
  return { counts, remaining: left }
}

function distributeSeatsAcrossRows(totalSeats, compact, dotR) {
  if (totalSeats <= 0) return []
  const maxRowsHard = compact ? MAX_ROWS.compact : MAX_ROWS.normal
  const fromSqrt = Math.ceil(Math.sqrt(totalSeats) / 2.2)
  const fromDensity = Math.ceil(totalSeats / (compact ? 95 : 88))
  const rowCountGuess = Math.min(maxRowsHard, Math.max(1, Math.max(fromSqrt, fromDensity)))

  for (let widen = 0; widen < 58; widen += 1) {
    const rowCount = Math.min(maxRowsHard, Math.max(1, rowCountGuess + widen))
    const radii = rowRadii(compact, rowCount)
    const caps = radii.map((R) => maxSeatsOnAngularArc(R, compact, dotR))
    const totalCap = caps.reduce((a, b) => a + b, 0)
    if (totalCap < totalSeats) continue

    let counts = initialWeightedRowSplits(totalSeats, rowCount)
    if (counts.length !== rowCount) continue

    if (!rebalanceAcrossCaps(counts, caps)) continue
    if (counts.some((c, i) => c > caps[i])) continue

    return radii.flatMap((rad, rowIndex) => arcSeatPositions(counts[rowIndex], rad, compact, dotR))
  }

  const rowCount = maxRowsHard
  const radii = rowRadii(compact, rowCount)
  const caps = radii.map((R) => maxSeatsOnAngularArc(R, compact, dotR))
  const { counts, remaining } = waterfillCounts(totalSeats, caps)
  if (remaining > 0) return null

  return radii.flatMap((rad, rowIndex) => arcSeatPositions(counts[rowIndex], rad, compact, dotR))
}

function hemicycleSeatPositions(totalSeats, compact, dotR) {
  const pts = distributeSeatsAcrossRows(totalSeats, compact, dotR)
  if (pts === null) return null
  if (!pts.length) return []
  if (pts.length !== totalSeats) return null
  return pts.slice().sort((a, b) => a.x - b.x || b.y - a.y)
}

function pairwiseMinCenterDistance(points) {
  if (points.length < 2) return Infinity
  let minD = Infinity
  for (let i = 0; i < points.length; i += 1) {
    const pi = points[i]
    for (let j = i + 1; j < points.length; j += 1) {
      const pj = points[j]
      const dx = pi.x - pj.x
      const dy = pi.y - pj.y
      minD = Math.min(minD, Math.hypot(dx, dy))
    }
  }
  return Number.isFinite(minD) ? minD : 0
}

function chooseHemicycleRadius(totalSeats, compact) {
  if (totalSeats < 2) return compact ? 5.7 : 6.7
  const maxR = compact ? 5.7 : 6.7
  const floorR = compact ? 0.88 : 0.92
  const epsilon = overlapEpsilon(compact)
  let r = maxR
  for (let i = 0; i < 260 && r > floorR; i += 1) {
    const pts = hemicycleSeatPositions(totalSeats, compact, r)
    if (!pts || pts.length !== totalSeats) {
      r -= 0.1
      continue
    }
    const minDist = pairwiseMinCenterDistance(pts)
    if (minDist >= 2 * r + epsilon) return r
    const shortage = Math.max(0, 2 * r + epsilon - minDist)
    const slack = Math.max(0.04, Math.min(shortage * 0.52 + 0.05, r * 0.16))
    r -= slack
  }
  while (r > 0.75) {
    const pts = hemicycleSeatPositions(totalSeats, compact, r)
    if (pts && pts.length === totalSeats && pairwiseMinCenterDistance(pts) >= 2 * r + epsilon) return r
    r -= 0.035
  }
  return compact ? 0.75 : 0.78
}

export function buildParliamentSeatLayout(flatSeats, { compact = false } = {}) {
  const n = flatSeats.length

  if (n === 0) {
    return emptyParliamentLayout()
  }

  const radius = chooseHemicycleRadius(n, compact)
  let positions = hemicycleSeatPositions(n, compact, radius)

  if (!positions || positions.length !== n) {
    let r = radius
    for (let k = 0; k < 110 && (!positions || positions.length !== n); k += 1) {
      r = Math.max(0.76, r - 0.16)
      positions = hemicycleSeatPositions(n, compact, r)
    }
  }

  if (!positions || positions.length !== n) {
    positions = hemicycleSeatPositions(n, compact, 0.76)
  }

  const dotR = positions[0]?.r ?? radius
  const seats = flatSeats.map((seat, index) => ({
    ...seat,
    x: positions[index]?.x ?? PARLIAMENT_SVG_WIDTH / 2,
    y: positions[index]?.y ?? VIZ_HEIGHT * 0.72,
    r: dotR,
  }))

  return parliamentLayoutMeta(seats)
}

function parliamentLayoutMeta(seats) {
  const cx = PARLIAMENT_SVG_WIDTH / 2
  return {
    seats,
    layoutWidth: PARLIAMENT_SVG_WIDTH,
    viewBox: CHAMBER_VIZ_VIEWBOX,
    centerX: cx,
    lineY1: 76,
    lineY2: 352,
    labelGov: { x: 20, y: 388 },
    labelOpp: { x: 700, y: 388 },
  }
}

export function buildGridSeatLayout(flatSeats, { compact = false } = {}) {
  const n = flatSeats.length
  if (n === 0) {
    return {
      seats: [],
      viewBox: CHAMBER_VIZ_VIEWBOX,
    }
  }

  const gap = GRID_SEAT_HORIZONTAL_GAP
  const columns = compact ? 30 : 36
  const radius = compact ? 5.2 : 5.8

  const rows = Math.max(1, Math.ceil(n / columns))
  const bandTop = (VIZ_HEIGHT - GRID_BODY_HEIGHT) / 2
  const startY = bandTop + Math.max(24, (GRID_BODY_HEIGHT - (rows - 1) * gap) / 2)

  const seats = flatSeats.map((seat, index) => {
    const row = Math.floor(index / columns)
    const column = index % columns
    const rowCount = Math.min(columns, n - row * columns)
    const rowWidth = (rowCount - 1) * gap
    const rowStartX = (PARLIAMENT_SVG_WIDTH - rowWidth) / 2
    return {
      ...seat,
      x: rowStartX + column * gap,
      y: startY + row * gap,
      r: radius,
    }
  })

  return {
    seats,
    viewBox: CHAMBER_VIZ_VIEWBOX,
  }
}

function emptyParliamentLayout() {
  const w = PARLIAMENT_SVG_WIDTH
  return {
    seats: [],
    layoutWidth: w,
    viewBox: CHAMBER_VIZ_VIEWBOX,
    centerX: w / 2,
    lineY1: 76,
    lineY2: 352,
    labelGov: { x: 20, y: 388 },
    labelOpp: { x: 700, y: 388 },
  }
}
