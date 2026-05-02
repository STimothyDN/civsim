# Election Trend System

Trends are narrative-aware vote modifiers. They are designed to be usable both by the random election climate generator and by a future prompt-driven narrative layer.

## Trend Template Shape

- `id`, `label`, `description`: stable identity and UI copy.
- `complexity`: `simple`, `compound`, or `storyline`.
- `family`: broad storyline family such as `labor`, `economy`, `security`, or `autonomy`.
- `scope`: narrative scope, for example `national`, `region`, `province`, `county`.
- `tags`: interaction hooks used by the engine and future prompt selection.
- `narrative`: LLM-ready metadata with `hook`, `promptTags`, and optional `beats`.
- `magnitudeRange`: randomized base strength for each generated trend.
- `effects`: concrete score modifiers applied to one or more levels and parties.
- `interactions`: optional tag-based amplifiers/dampeners when other matching trends are active.

## Effect Shape

Each effect may define:

- `level`: `national`, `province`, `county`, or an array of levels.
- `party`: party id to boost or suppress.
- `mode`: `boost` by default; `suppress` applies a negative score pressure.
- `selector`: area matcher. Supports legacy selector keys plus `any`, `all`, `not`, `minFeatures`, `maxFeatures`, terrain/resource/name/group/original-country filters, connectedness/frontier feature checks, and capital/conquest flags.
- `adjacency`: optional province-effect spillover. When present, matching source provinces can push a reduced effect into their closest provinces, with distance decay controlled by `maxDistance`, `minMultiplier`, `maxMultiplier`, `cap`, `sourceSelector`, and `targetSelector`.
- `magnitudeFactor` or `magnitudeRange`: per-effect strength relative to the trend base.
- `weightBy`: area-affinity scaling from feature values, such as `industrial_index` or `localist_index`.
- `interactions`: per-effect interaction rules.

## Prompt-Driven Readiness

A future narrative prompt layer should not need to rewrite the engine. It can:

1. Filter templates by `family`, `scope`, `complexity`, `tags`, or `narrative.promptTags`.
2. Select templates that fit the requested election story.
3. Tune generated `magnitude` and effect-level magnitudes.
4. Add or edit selectors to target named regions, provinces, counties, or feature profiles.
5. Compose simple trends with compound/storyline trends; the existing interaction rules will amplify or dampen overlapping narratives.
