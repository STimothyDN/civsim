export const SIMPLE = 'simple'
export const COMPOUND = 'compound'
export const STORYLINE = 'storyline'

export function narrative(hook, promptTags = [], beats = []) {
  return { hook, promptTags, beats }
}
