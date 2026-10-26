import { clamp01, num } from '../normalization/numbers'

/**
 * Political temperaments, computed the same way at every scope from that
 * scope's composition and identity features.
 *
 * @param {Record<string, number>} f feature vector (composition + identity)
 * @param {number} remote 0..1 remoteness — distance from the city center for a
 *   county, distance from neighboring provinces (frontier) for a province
 */
export function attitudeFeatures(f, remote) {
  const v = (key) => num(f[key])
  const remoteLand = Math.max(v('mountain_index'), v('hardship_index'), v('wilderness_index'))

  return {
    // Conservative country life against modern urban life, centered on 0.5.
    traditionalist_index: clamp01(0.5 + 0.5 * (
      (v('rural_index') + v('agrarian_index') + v('military_index') + v('state_religion_share')) / 4 -
      (v('urban_index') + v('intellectual_index') + v('middle_class_index') + v('development_index')) / 4
    )),
    localist_index: clamp01(
      0.25 * clamp01(remote) +
      0.2 * v('foreign_origin_index') +
      0.15 * v('conquered_index') +
      0.15 * v('minority_religion_share') +
      0.15 * (1 - v('imperial_core_index')) +
      0.1 * remoteLand
    ),
    restorationist_index: clamp01(
      0.35 * v('conquered_index') +
      0.2 * v('foreign_origin_index') +
      0.2 * v('heritage_index') +
      0.15 * v('minority_religion_share') +
      0.1 * v('spiritual_index')
    ),
    worker_grievance_index: clamp01(
      (0.55 * v('worker_index') + 0.25 * v('urban_index') + 0.2 * v('pollution_index')) *
      (0.3 + 0.7 * (1 - v('happiness_index')))
    ),
  }
}
