# Political model

How the election engine turns a world into party scores. Parties score each
county, province and the nation as

```
score(party, unit) = bias[scope] + Σ affinity[scope][feature] × feature(unit) + voter blocs
```

and vote shares are scores normalized to 1. This file covers the **features**:
what they mean and how each is computed. Party weights live in
`constants/defaultParties.js` (defaults) or the world's `config.parties`
(Advanced Setup); voter blocs in `constants/defaultVoterBlocs.js`.

## Principles

- **One key per concept, at every scope.** `urban_index` is urban density in a
  county, a province and the nation alike, so any feature can be weighted at any
  scope. The list, with labels and groups, is `features/featureCatalog.js`.
- **The catalog says what things are; formulas add context.** Every Civ 6
  terrain, feature, resource, improvement, district, wonder and building in
  `src/domain/civ6` carries a *profile*: how strongly it, on its own, makes a
  county belong to each dimension (0.1 faint … 0.9 defining; negative values
  dampen). Formulas only add what the catalog can't know — distance, yields,
  railroad, river, great works, appeal, and the province's identity.
- **Diminishing returns.** Contributions to a dimension combine as a *soft OR*,
  `1 − Π(1 − w)`: a Campus with a Library and University reads near, never past,
  1. Negative weights multiply the result by `Π(1 + w)`.
- **Everything is 0..1.**

## County features — `features/countyFeatures.js`

`collectCountyProfile` (`features/countyProfile.js`) combines the profiles of the
county's terrain, every enabled feature key (map-named regions such as "Sonoran
Desert" match keyword patterns in `civ6/features.js`), its resource (half
strength on an unimproved tile), its improvement and every built building.

| Feature | Catalog dimension | Context added |
| --- | --- | --- |
| urban | urban | 0.3 × proximity to the center (if improved), 0.12 × railroad |
| rural | rural | 0.45 × remoteness, 0.3 for unimproved land; × (1 − 0.7·urban) |
| agrarian | agrarian | 0.35 × food yield |
| industrial | industrial | 0.12 × railroad (if improved) |
| extractive | extractive | — |
| commercial | commercial | 0.35 × gold yield, 0.1 for an improved river tile |
| maritime | maritime | — |
| worker | worker | 0.3 × production yield |
| development | development | 0.3 if improved, 0.4 × buildings/6, 0.3 × railroad |
| economic_diversity | — | evenness (normalized entropy) of the six yields |
| military | military | 0.12 × remoteness |
| intellectual | intellectual | 0.4 × science yield |
| spiritual | spiritual | 0.4 × faith yield |
| cultural_elite | cultural | 0.35 × culture yield, 0.5 × great works/4, 0.25 × heritage |
| civic_monument | civic | — |
| middle_class | middle_class | 0.3 × urban × appeal |
| leisure_tourism | leisure | 0.3 × appeal, 0.2 × great works, 0.25 × heritage |
| heritage | heritage | 0.15 × great works |
| coastal, mountain, hardship | same | — |
| wilderness | wilderness | 0.3 × remoteness if unimproved; × (1 − 0.7·urban) |
| ecology | ecology | × (1 − 0.5·pollution) |
| watershed | watershed | 0.9 on a river |
| infrastructure | infrastructure | 0.45 × railroad, 0.15 river, 0.15 if improved |
| pollution | pollution | 0.12 × urban |
| appeal | — | tile appeal / 12 (0.35 when unrecorded) |
| yields | — | per tile, normalized (`normalization/dataStats.js`) |

*Remoteness* is `(distance from center / 5)^1.5`. Counties also carry their
province's identity features (below).

## Attitudes — `features/attitudes.js`

The same formulas at every scope, from that scope's features. *Remote* is
county remoteness, or `frontier_index` for a province.

- **traditionalist** = 0.30 rural + 0.20 agrarian + 0.15 military + 0.20 state
  religion + 0.15 (1 − max(urban, intellectual))
- **localist** = 0.25 remote + 0.20 foreign origin + 0.15 conquered + 0.15
  minority religion + 0.15 (1 − imperial core) + 0.10 max(mountain, hardship,
  wilderness)
- **restorationist** = 0.35 conquered + 0.20 foreign origin + 0.20 heritage +
  0.15 minority religion + 0.10 spiritual
- **worker_grievance** = (0.55 worker + 0.25 urban + 0.20 pollution) ×
  (0.3 + 0.7 (1 − happiness))

Catalog entries can nudge the first three directly (a Government Plaza lowers
localism; a Kurgan raises traditionalism).

## Province features — `features/provinceFeatures.js`

**Identity** (province-native; counties inherit them):

- **imperial_core** = 0.28 national capital + 0.12 regional capital + 0.08
  founded + 0.14 loyalty + 0.10 state religion + 0.10 home continent + 0.08
  (1 − frontier) + 0.05 culture + 0.05 science − 0.12 foreign origin; × 0.6 if
  conquered
- **loyalty**, **happiness** (0.6 happiness % + 0.4 net amenities),
  **state_religion_share**, **minority_religion_share**,
  **religious_homogeneity** (HHI), **foreign_origin**, **same_continent**,
  **conquered**, **frontier** (average distance to neighbors).
- `religion_shares` (per religion; not weighted) feeds religion voter blocs.

**Composition** — county features aggregated three ways:

- *population-weighted* (what most people do): urban, rural, agrarian,
  industrial, extractive, commercial, worker, development, middle class
- *area* (share of tiles): coastal, mountain, wilderness, ecology, hardship,
  watershed, appeal, infrastructure, pollution
- *presence* (one institution marks the province): maritime, military,
  intellectual, spiritual, arts, state institutions, leisure, heritage —
  `1 − (1 − population-weighted)(1 − 0.6 × strongest county)`

**Blank counties.** `county_coverage` is the share of the province's population
in counties with any terrain, feature, resource, improvement, building or yield.
For the uncovered share, province yields per citizen stand in: agrarian ← food,
industrial ← 0.7 production, extractive ← 0.5 production, worker ← 0.7
production, commercial ← gold, intellectual ← science, spiritual ← faith, arts ←
culture, urban ← 0.7 × population/30.

**development** is half the counties' and half the province's own (culture,
science, gold per citizen, happiness). **Attitudes** are half the province's own
reading and half its counties'. **Yields** are per citizen.

## National features — `features/nationalFeatures.js`

Every feature, weighted by provincial population.

## Earlier versions of the model

`LEGACY_FEATURE_MAP` in `featureCatalog.js` records what every removed key
became. Saved party weights are migrated on load (exactly, for complements:
a weight on `imperial_origin_index` becomes a negative weight on
`foreign_origin_index` plus bias); trend selectors, voter-bloc feature sources
and LLM output read old keys through `readFeature`.

## Tuning

- What a game element means politically: its `profile` in `src/domain/civ6`.
  `civ6/catalog.test.js` keeps every pickable entry meaningful.
- How context and aggregation work: the formulas above.
- How parties respond: affinities and biases (defaults, Advanced Setup, or the
  balanced / data-driven / narrative generators in `weightGenerators.js`).
