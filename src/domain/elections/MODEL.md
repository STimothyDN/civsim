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

- **traditionalist** = 0.5 + 0.5 × (mean of rural, agrarian, military, state
  religion − mean of urban, intellectual, middle class, development): country
  conservatism against modern urban life
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

**Blank counties.** A county is *described* if it has any terrain, feature,
resource, improvement, building or yield; `county_coverage` is the population
share living in described counties. `blankCountyStandIns` says what a blank
county is taken to be made of, from the province's yields per citizen and size
(coefficients fitted to the fully described Khmer provinces):

| Feature | Stand-in |
| --- | --- |
| urban / rural | 0.2 + 0.5·size / 0.45 − 0.25·size (size = population / 30) |
| agrarian | food |
| industrial / worker / extractive | 0.48 / 0.34 / 0.16 × production |
| commercial | 0.63 × gold |
| middle class | 1.2 × gold × (0.5 + 0.5 happiness) |
| academia / religious life / arts | 1.3 × science / 1.7 × faith / 1.37 × culture |
| development | the province's own development reading |
| state institutions | 0.6 (every province has a City Center) |
| infrastructure | 0.5 × development |

A province reads stand-in features as `coverage × (described counties) +
(1 − coverage) × stand-in`. A blank county *votes* as its province's average
voter: the stand-ins times `COUNTY_SCALE` (below), yields included — so an
unknown county votes like its province's economy, not like empty countryside.

**development** is half the counties' and half the province's own (culture,
science, gold per citizen, happiness). **economic_diversity** blends described
counties with the province's yield evenness stretched from 0.8–1 to 0–1.
**Attitudes** are half the province's own reading and half its counties'.
**Yields** are per citizen.

## Scope scale — `COUNTY_SCALE` in `featureCatalog.js`

Every feature means the same thing at every scope, but some *read* differently:
a province has academia or a navy when one county is a Campus or Harbor
(presence), its yields are per citizen not per tile, and its land is read by
area while people cluster on rivers and rails and away from coasts and wilds.
`COUNTY_SCALE[f]` is the typical county reading as a share of the province
reading (1 for every economy and class feature). It is used to

- read a blank county as its province's average voter, and
- carry a party's county weights to province and national scope so they pull
  equally hard there (default parties, and the narrative weight generator).

Measured on the fully described Khmer provinces: academia/navy 0.1, religious
life/heritage 0.15, military 0.2, arts 0.25, leisure 0.3, state institutions
0.4, restorationism 0.7; yields 0.1 (culture, science) to 0.6 (food); coast 0.2,
wilds/ecology 0.3, highlands 0.7, harsh land 0.85, river valley 1.5, pollution
1.8, infrastructure 2.

## National features — `features/nationalFeatures.js`

Every feature, weighted by provincial population.

## Earlier versions of the model

`LEGACY_FEATURE_MAP` in `featureCatalog.js` records what every removed key
became. Saved party weights are migrated on load (exactly, for complements:
a weight on `imperial_origin_index` becomes a negative weight on
`foreign_origin_index` plus bias); trend selectors, voter-bloc feature sources
and LLM output read old keys through `readFeature`.

## Vote decisiveness — `decisiveness` in election rules

Scores become votes through one more step, at every level (county, province,
national), before trends and random swings:

```
vote(party) ∝ score × (score / norm)^(decisiveness − 1) × trends × swings
```

`norm` is the party's typical score at that level across the whole world
(population-weighted, rounded to two significant digits — `calculateScoreNorms`).
Where a party polls its usual strength nothing changes; where it out-polls its
usual (its heartland) its lead grows, and where it under-polls it fades. That
gives parties strongholds without favoring whichever party happens to lead an
average place. 1 is proportional voting (the earlier behavior); the default is
2 at every level (Advanced Setup → Election Rules). Trends and random swings are
multiplicative and applied afterwards, so they keep their designed strength.

## Balance

The default parties (`constants/defaultParties.js`) and voter blocs
(`constants/defaultVoterBlocs.js`) are balanced on the bundled Khmer world at
decisiveness 2. Each party is one map of county weights, written from its
ideology, with concentrated weight on its core features (broad, near-universal
features such as state-religion share act like a fixed base and blunt
strongholds); province/national weights follow from `COUNTY_SCALE`. Negative
weights are kept small.

**Biases** are fitted by `balance/calibrateBiases.js`: in an *expected*
election (every random swing at zero), each level's bias is tuned until the
party hits its national target — the four majors 19.5% each, white 7.5%,
purple 6.5%, green 8% (`DEFAULT_BALANCE_TARGETS`). Shares barely move when every
bias rises together but results flatten, so each round the level's biases shift
down together until the lowest sits on the floor: base support stays as low as
the targets allow and heartlands carry the vote. (An identity party that
over-shoots its target even at the floor props everyone else's base up; that is
why the default bloc strengths are moderate.) Random swings then move each
major about ±2.5 points per election.

What that gives on the Khmer world (30 seeded elections):

| Party | Vote | Assembly seats | Council seats | Provinces won | Safe provinces | Largest in assembly |
| --- | --- | --- | --- | --- | --- | --- |
| Yellow | 19.6% | 126 | 18 | 9.1 | 1.5 | 4 / 30 |
| Orange | 19.3% | 133 | 22 | 7.1 | 0.9 | 8 / 30 |
| Red | 19.4% | 136 | 27 | 15.6 | 4.6 | 12 / 30 |
| Blue | 19.6% | 134 | 21 | 9.2 | 1.7 | 6 / 30 |
| White | 7.7% | 42 | 7 | 4.9 of 5 American | 3.5 | — |
| Purple | 6.5% | 39 | 15 | 9.1 of 13 Roman | 5.0 | — |
| Green | 8.0% | 37 | 0 | — | — | — |

Per election about 18 provinces are safe (winning margin ≥ 12 points), 18 likely
and 19 toss-ups; province winners take a median 31% (top ~52%). Counties are
decisive: rebuilt in the capital, a farm votes 65% red, an industrial zone 81%
orange, a commercial hub 55% blue, a government plaza 65% yellow, a national
park 70% green. Each party's county vote tracks its core feature (imperial
core, working class, traditionalism, middle class, ecology, foreign origin,
restorationism). `balance.test.js` holds these properties; if an engine or
catalog change trips it, re-run the calibration rather than loosening the
bounds.

Known leans: strongholds reward support spread over many provinces, so red —
the party of the many small agrarian stub provinces — is the largest party
more often than the others, and leads the council (two seats per province in
the Khmer world's federalist structure) most of the time. Yellow's vote is
concentrated in the imperial core and wins the fewest council seats. Rich,
mixed provinces (many district types) stay competitive; homogeneous ones —
identity homelands, agrarian stubs — become strongholds.

Existing worlds keep their own weights. Advanced Setup's **Default Weights**
(Political Model) and **Default Blocs** (Voter Blocs) apply this balance to a
world; the two are calibrated together, at decisiveness 2.

## Tuning

- What a game element means politically: its `profile` in `src/domain/civ6`.
  `civ6/catalog.test.js` keeps every pickable entry meaningful.
- How context and aggregation work: the formulas above.
- How parties respond: affinities and biases (defaults, Advanced Setup, or the
  default / balanced / data-driven / narrative generators in
  `weightGenerators.js`); `calibrateBiases` re-fits biases to any world.
- How decisive results are: election rules `decisiveness` (per level).
