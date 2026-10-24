import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_ENDPOINT,
  DEFAULT_MODEL,
  requestCultureNames,
  requestElectionBroadcast,
  requestElectionClimateSummary,
  requestElectionTicker,
  requestElectionNarrativePlan,
  requestNarrativeVoterBlocs,
  compileNarrativeVoterBlocs,
  requestPoliticalModelWeights,
  requestPollBreakdown,
  requestRepresentativeNames,
} from './narrativePlanner'

function mockChatResponse(content) {
  const encoder = new TextEncoder()
  const event = (type, data) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`
  const streamText = [
    event('chat.start', { model_instance_id: 'google/gemma-4-e4b' }),
    event('model_load.start', { model_instance_id: 'google/gemma-4-e4b' }),
    event('model_load.progress', { model_instance_id: 'google/gemma-4-e4b', progress: 0.65 }),
    event('model_load.end', { model_instance_id: 'google/gemma-4-e4b', load_time_seconds: 1.2 }),
    event('prompt_processing.start', {}),
    event('prompt_processing.progress', { progress: 0.5 }),
    event('prompt_processing.end', {}),
    event('message.start', {}),
    event('message.delta', { content }),
    event('message.end', {}),
    event('chat.end', {
      result: {
        model_instance_id: 'google/gemma-4-e4b',
        output: [{ type: 'message', content }],
        stats: {
          input_tokens: 120,
          total_output_tokens: 36,
          tokens_per_second: 41.2,
          time_to_first_token_seconds: 0.32,
        },
      },
    }),
  ].join('')

  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(streamText))
        controller.close()
      },
    }),
    text: async () => streamText,
  })
}

function lastRequestBody() {
  const fetchMock = globalThis.fetch
  return JSON.parse(fetchMock.mock.calls.at(-1)[1].body)
}

function sampleWorld() {
  return {
    country: {
      basic_info: { name: 'Khmer Empire', leader: 'Jayavarman VII' },
      total_population: '845',
      state_religion: 'Zoroastrianism',
      economy: {
        gold_per_turn: '3472.1',
        faith_per_turn: '1566.5',
      },
    },
    province_groups: [{ name: 'Capital Region', regional_population: 1000, assemblypeople: 12, prelates: 6 }],
    provinces: [
      {
        name: 'Angkor Thom',
        group: 'Capital Region',
        is_national_capital: true,
        is_founded: true,
        population: '30',
        provincial_population: 1200,
        loyalty: '52',
        happiness_percentage: '115',
        growth_percentage: '120',
        yields: { food: '80', production: '70', culture: '65' },
        religions: [{ name: 'Zoroastrianism', followers: '28' }],
        counties: [
          {
            name: 'Rail Works',
            terrain: 'Plains',
            resource: 'Coal',
            river: true,
            has_railroad: true,
            improvement: { name: 'Industrial Zone', buildings: { Workshop: true }, great_works: {} },
          },
        ],
      },
    ],
  }
}

function sampleTrend() {
  return {
    templateId: 'rail-opening',
    label: 'Rail Opening',
    description: 'A new rail corridor rewards the establishment in connected counties.',
    party: 'yellow',
    scope: ['county'],
    tags: ['infrastructure', 'incumbency'],
    narrative: {
      hook: 'Ribbon cuttings and rail access make development feel immediate.',
      reason: 'Rail-heavy capital context.',
    },
    magnitude: 0.18,
  }
}

function chamber({ yellow = 0.4, orange = 0.3, seats = { yellow: 8, orange: 5, red: 3, blue: 2, white: 1, purple: 1 } } = {}) {
  return {
    vote_shares: { yellow, orange, red: 0.12, blue: 0.1, white: 0.05, purple: 0.03 },
    seats,
    seat_count: Object.values(seats).reduce((sum, value) => sum + value, 0),
    control: {
      label: 'Divinus Sol majority',
      detail: `${seats.yellow} of ${Object.values(seats).reduce((sum, value) => sum + value, 0)} seats`,
      majority: 11,
      leaderParty: 'yellow',
      supportParties: [],
      status: seats.yellow >= 11 ? 'majority' : 'minority-government',
    },
  }
}

function sampleResults() {
  const nationalAssembly = chamber({ yellow: 0.42, orange: 0.28 })
  const regionalAssembly = chamber({ yellow: 0.48, orange: 0.25, seats: { yellow: 5, orange: 2, red: 1, blue: 1, white: 0, purple: 0 } })

  return {
    config: { trends: [sampleTrend()] },
    national: {
      population: 2000,
      assembly: nationalAssembly,
      prelates: {
        seats: { yellow: 4, orange: 2, red: 1, blue: 1, white: 0, purple: 0 },
        seat_count: 8,
        control: { label: 'Divinus Sol majority', detail: '4 of 8 seats', majority: 5 },
      },
    },
    regions: {
      'Capital Region': {
        name: 'Capital Region',
        population: 1200,
        province_count: 1,
        provinces: ['Angkor Thom'],
        assembly: regionalAssembly,
        prelates: {
          seats: { yellow: 3, orange: 1, red: 1, blue: 1, white: 0, purple: 0 },
          seat_count: 6,
          control: { label: 'Divinus Sol majority', detail: '3 of 6 seats', majority: 4 },
        },
      },
    },
    provinces: [
      {
        name: 'Angkor Thom',
        city_id: 1,
        group: 'Capital Region',
        is_national_capital: true,
        provincial_population: 1200,
        assemblypeople: 9,
        political_features: { industrial_index: 0.72, imperial_core_index: 0.8 },
        assembly: regionalAssembly,
        prelates: {
          seats: { yellow: 3, orange: 1, red: 1, blue: 1, white: 0, purple: 0 },
          seat_count: 6,
          control: { label: 'Divinus Sol majority', detail: '3 of 6 seats', majority: 4 },
        },
        counties: [
          {
            name: 'Rail Works',
            tile_id: 'tile_1',
            county_population: 600,
            terrain: 'Plains',
            improvement_name: 'Industrial Zone',
            vote_shares: { yellow: 0.52, orange: 0.32, red: 0.06, blue: 0.05, white: 0.03, purple: 0.02 },
          },
        ],
      },
    ],
  }
}

function sampleBaselineResults() {
  const results = sampleResults()
  results.config = { trends: [] }
  results.national.assembly.vote_shares = { yellow: 0.36, orange: 0.34, red: 0.12, blue: 0.1, white: 0.05, purple: 0.03 }
  results.regions['Capital Region'].assembly.vote_shares = { yellow: 0.39, orange: 0.34, red: 0.12, blue: 0.1, white: 0.03, purple: 0.02 }
  results.provinces[0].assembly.vote_shares = results.regions['Capital Region'].assembly.vote_shares
  results.provinces[0].counties[0].vote_shares = { yellow: 0.43, orange: 0.39, red: 0.07, blue: 0.05, white: 0.04, purple: 0.02 }
  return results
}

describe('narrativePlanner LLM prompts', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sends compact world and template context for narrative planning', async () => {
    mockChatResponse(JSON.stringify({
      title: 'Rail Wage Pact',
      summary: 'Rail investment frames the election.',
      selections: [{ templateId: 'rail-opening', intensity: 0.55, reason: 'Rail-heavy counties fit.' }],
      jitter: {
        seedHint: 'rail-wage-pact',
        volatility: { national: 0.05, region: 0.08, province: 0.12, county: 0.2 },
      },
    }))

    const { packageDef } = await requestElectionNarrativePlan({
      narrative: 'A rail boom is helping the imperial center.',
      data: sampleWorld(),
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'google/gemma-4-e4b',
    })

    const body = lastRequestBody()
    const userPayload = JSON.parse(body.input)
    const railTemplate = userPayload.TREND_TEMPLATES.find((template) => template.id === 'rail-opening')

    expect(body.model).toBe('google/gemma-4-e4b')
    expect(body.max_output_tokens).toBe(1700)
    expect(body.context_length).toBe(131072)
    expect(body.stream).toBe(true)
    expect(body.store).toBe(false)
    expect(userPayload.CURRENT_WORLD.country).toMatchObject({ name: 'Khmer Empire', leader: 'Jayavarman VII' })
    expect(userPayload.CURRENT_WORLD.provinceGroups[0]).toMatchObject({ name: 'Capital Region', provinceCount: 1 })
    expect(userPayload.CURRENT_WORLD.countySignals).toMatchObject({ railroadCount: 1, riverCountyCount: 1 })
    expect(userPayload.CURRENT_WORLD.notableProvinces[0]).toMatchObject({ name: 'Angkor Thom' })
    expect(userPayload.PARTY_LEGEND.some((party) => party.id === 'yellow' && party.name === 'Divinus Sol')).toBe(true)
    expect(userPayload.CUSTOM_TREND_GRAMMAR.allowedFeatureNames).toContain('infrastructure_index')
    expect(railTemplate).toMatchObject({ kind: 'simple', parties: expect.arrayContaining(['yellow']) })
    expect(packageDef.trends[0].templateId).toBe('rail-opening')
  })

  it('compiles conservative custom trends when templates are insufficient', async () => {
    mockChatResponse(JSON.stringify({
      title: 'Canal Guild Revolt',
      summary: 'A local guild dispute needs one generated effect.',
      selections: [],
      jitter: {
        seedHint: 'canal-guild-revolt',
        volatility: { national: 0.05, region: 0.08, province: 0.12, county: 0.2 },
      },
      customTrends: [
        {
          label: 'Canal Guild Revolt',
          description: 'Canal guilds organize around neglected transport tolls.',
          family: 'labor',
          tags: ['canal', 'guild', 'labor'],
          reason: 'No existing canal-specific template fits.',
          effects: [
            {
              level: 'county',
              party: 'orange',
              mode: 'boost',
              magnitude: 0.9,
              selector: {
                minFeatures: { feature: 'infrastructure_index', value: 0.4 },
                groupIncludes: 'Capital',
                unknownSelector: 'ignored',
              },
              weightBy: { feature: 'worker_index', minMultiplier: 0.7, maxMultiplier: 1.9 },
            },
            {
              level: 'province',
              party: 'chartreuse',
              magnitude: 0.1,
            },
          ],
        },
        {
          label: 'Invalid Custom Trend',
          effects: [{ level: 'region', party: 'chartreuse', magnitude: 1 }],
        },
      ],
    }))

    const { packageDef } = await requestElectionNarrativePlan({
      narrative: 'A canal guild revolt is affecting toll counties.',
      data: sampleWorld(),
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'google/gemma-4-e4b',
    })

    expect(packageDef.trends).toHaveLength(1)
    expect(packageDef.trends[0]).toMatchObject({
      label: 'Canal Guild Revolt',
      complexity: 'custom',
      source: 'llm-custom',
      party: 'orange',
      magnitude: 0.26,
    })
    expect(packageDef.trends[0].effects).toHaveLength(1)
    expect(packageDef.trends[0].effects[0]).toMatchObject({
      level: 'county',
      party: 'orange',
      selector: {
        groupIncludes: ['Capital'],
        minFeatures: { feature: 'infrastructure_index', value: 0.4 },
      },
      weightBy: { feature: 'worker_index', maxMultiplier: 1.8 },
    })
    expect(packageDef.trends[0].effects[0].selector).not.toHaveProperty('unknownSelector')
  })

  it('keeps random climate naming concise while preserving trend context', async () => {
    mockChatResponse(JSON.stringify({
      scenarioName: 'Rail Mandate',
      scenarioDescription: 'Rail investment turns the climate toward imperial development.',
    }))

    const metadata = await requestElectionClimateSummary({
      trends: [sampleTrend()],
      seed: 'scenario-test',
      data: sampleWorld(),
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'google/gemma-4-e4b',
    })

    const body = lastRequestBody()
    const userPayload = JSON.parse(body.input)

    expect(body.max_output_tokens).toBe(480)
    expect(userPayload.CURRENT_WORLD.notableProvinces).toBeUndefined()
    expect(userPayload.RANDOMIZED_TRENDS[0]).toMatchObject({ label: 'Rail Opening', templateId: 'rail-opening' })
    expect(metadata.name).toBe('Rail Mandate')
  })

  it('passes structured broadcast trends and result numbers instead of object strings', async () => {
    mockChatResponse('We are projecting a Divinus Sol majority.\n\nThe math begins with the capital.\n\nRail counties moved first.\n\nThe swing is concentrated.\n\nThe mandate is narrow.')

    await requestElectionBroadcast({
      results: sampleResults(),
      baselineResults: sampleBaselineResults(),
      scope: 'national',
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'google/gemma-4-e4b',
    })

    const body = lastRequestBody()
    const userContent = body.input
    const userPayload = JSON.parse(userContent)

    expect(body.temperature).toBe(0.65)
    expect(body.max_output_tokens).toBe(3500)
    expect(userContent).not.toContain('[object Object]')
    expect(userPayload.activeTrends[0]).toMatchObject({ label: 'Rail Opening', templateId: 'rail-opening' })
    expect(userPayload.national.assembly.votePct.yellow).toBe(42)
    expect(userPayload.scopeBoundary).toContain('National page')
    expect(userPayload.focus.type).toBe('national')
    expect(userPayload.focus.regionalOverview).toBeUndefined()
    expect(userPayload.focus.examples[0].assembly.strongestSwing).toMatchObject({ party: 'yellow', points: 9 })

    // Seat/majority math is pre-computed for the local model rather than inferred.
    expect(userPayload.national.assembly.margin).toMatchObject({
      leaderParty: 'yellow',
      leaderSeats: 8,
      runnerUpParty: 'orange',
      runnerUpSeats: 5,
      seatLeadOverRunnerUp: 3,
      majorityThreshold: 11,
      seatsShortOfMajority: 3,
      hasOwnMajority: false,
    })
    expect(userPayload.national.assembly.margin.marginLabel).toContain('11-seat majority')
    expect(userPayload.national.assembly.margin.marginLabel).toContain('8 of 20')

    // Default (decentralized) structure is described to the model with a region tier.
    expect(userPayload.government).toMatchObject({
      structureId: 'decentralized',
      hasRegionTier: true,
    })
    expect(userPayload.government.chamberTitles.nationalAssemblyLeader).toBe('Prime Minister')
    expect(userPayload.government.chamberTitles.regionalAssemblyLeader).toBe('Premier')
    expect(userPayload.government.provinceDelegations).toBeUndefined()
  })

  it('describes a federalist structure with no region tier and per-province delegations', async () => {
    mockChatResponse('The federation has voted.\n\nProvinces sent their delegations.\n\nThe capital leads.\n\nThe upper house holds parity.\n\nThe mandate is set.')

    const federalistResults = sampleResults()
    federalistResults.config = {
      ...federalistResults.config,
      structure: { id: 'federalist', national: { upper: { basis: 'equalPerProvince', seatsPerProvince: 2 } } },
    }
    federalistResults.regions = {} // federalist has no region tier
    federalistResults.national.assembly.province_allocation = [
      { name: 'Angkor Thom', seats: 7 },
      { name: 'Hariharalaya', seats: 3 },
    ]

    await requestElectionBroadcast({
      results: federalistResults,
      baselineResults: sampleBaselineResults(),
      scope: 'national',
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'google/gemma-4-e4b',
    })

    const body = lastRequestBody()
    const userPayload = JSON.parse(body.input)

    expect(userPayload.government).toMatchObject({
      structureId: 'federalist',
      hasRegionTier: false,
    })
    expect(userPayload.government.chamberTitles.regionalAssemblyLeader).toBeUndefined()
    expect(userPayload.government.note).toContain('NO regional tier')
    expect(userPayload.government.nationalComposition.lower).toContain('apportioned ACROSS the provinces by population')
    expect(userPayload.government.nationalComposition.upper).toContain('small-province parity')
    expect(userPayload.government.provinceDelegations[0]).toMatchObject({ province: 'Angkor Thom', nationalAssemblySeats: 7 })
    expect(body.system_prompt).toContain('GOVERNMENT STRUCTURE')
  })

  it('sends regional scope and targetName to the broadcast prompt', async () => {
    mockChatResponse('Capital Region assembly is called for Divinus Sol.\n\nThe regional math is clear.\n\nProvinces held the line.\n\nSwings were contained.\n\nThe region remains stable.')

    const text = await requestElectionBroadcast({
      results: sampleResults(),
      baselineResults: sampleBaselineResults(),
      scope: 'regional',
      targetName: 'Capital Region',
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'google/gemma-4-e4b',
    })

    const body = lastRequestBody()
    const systemContent = body.system_prompt
    const userPayload = JSON.parse(body.input)

    expect(systemContent).toContain('Capital Region')
    expect(systemContent).toContain('Stay inside Capital Region')
    expect(userPayload.scope).toBe('regional')
    expect(userPayload.scopeBoundary).toContain('Capital Region')
    expect(userPayload.national).toBeUndefined()
    expect(userPayload.focus.type).toBe('regional')
    expect(userPayload.focus.region.name).toBe('Capital Region')
    expect(text).toContain('Capital Region assembly')
  })

  it('includes supplied polling context in broadcast and ticker payloads', async () => {
    const polling = {
      scope: 'national',
      scopeLabel: 'National',
      aggregate: {
        voteSharesPct: { yellow: 41.2, orange: 28.4, red: 12.1, blue: 10.3, white: 5, purple: 3 },
        projectedSeats: {
          assembly: { yellow: 9, orange: 5, red: 3, blue: 2, white: 1, purple: 0 },
          prelates: { yellow: 4, orange: 2, red: 1, blue: 1, white: 0, purple: 0 },
        },
        leader: 'yellow',
      },
      spread: {
        voteShareRangePct: { yellow: { min: 39.8, max: 42.4 } },
        assemblySeatRange: { yellow: { min: 8, max: 10 } },
      },
      pollsterCount: 4,
      methodologyNotes: ['Aurora Public Opinion: climate-weighted model.'],
    }

    mockChatResponse('Polling frames the national board.\n\nThe assembly math follows.\n\nThe capital confirms it.\n\nMargins remain live.\n\nThe outlook is cautious.')

    await requestElectionBroadcast({
      results: sampleResults(),
      baselineResults: sampleBaselineResults(),
      scope: 'national',
      polling,
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'google/gemma-4-e4b',
    })

    let body = lastRequestBody()
    let userPayload = JSON.parse(body.input)

    expect(body.system_prompt).toContain('POLLING CONTEXT: When polling.aggregate is provided')
    expect(userPayload.polling).toMatchObject({
      scope: 'national',
      scopeLabel: 'National',
      pollsterCount: 4,
      aggregate: {
        leader: 'yellow',
        voteSharesPct: { yellow: 41.2 },
      },
    })
    expect(userPayload.polling.methodologyNotes[0]).toContain('Aurora Public Opinion')

    // Polls-vs-result deltas are computed in JS so the model quotes them rather than subtracting.
    const yellowDiff = userPayload.pollingVsResult.parties.find((row) => row.party === 'yellow')
    expect(yellowDiff).toMatchObject({
      pollPct: 41.2,
      resultPct: 42,
      voteDeltaPct: 0.8,
      projectedSeats: 9,
      actualSeats: 8,
      seatDelta: -1,
    })
    expect(userPayload.pollingVsResult.biggestSurprise).toBeTruthy()

    vi.restoreAllMocks()
    mockChatResponse('Polls show Divinus Sol ahead, but the spread keeps the call cautious.')

    await requestElectionTicker({
      results: sampleResults(),
      baselineResults: sampleBaselineResults(),
      scope: 'national',
      polling,
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'google/gemma-4-e4b',
    })

    body = lastRequestBody()
    userPayload = JSON.parse(body.input)

    expect(body.system_prompt).toContain('Treat polling.aggregate')
    expect(userPayload.polling.aggregate.projectedSeats.assembly.yellow).toBe(9)
    expect(userPayload.polling.spread.voteShareRangePct.yellow).toMatchObject({ min: 39.8, max: 42.4 })
  })

  it('sends detailed pollster context to the poll breakdown roundtable prompt', async () => {
    const polling = {
      scope: 'national',
      scopeKey: 'national',
      scopeLabel: 'National',
      aggregate: {
        voteShares: { yellow: 0.412, orange: 0.284, red: 0.121, blue: 0.103, white: 0.05, purple: 0.03 },
        seats: {
          assembly: { yellow: 9, orange: 5, red: 3, blue: 2, white: 1, purple: 0 },
          prelates: { yellow: 4, orange: 2, red: 1, blue: 1, white: 0, purple: 0 },
        },
        leader: 'yellow',
        spread: {
          voteShareRangePct: { yellow: { min: 39.8, max: 42.4 } },
          assemblySeatRange: { yellow: { min: 8, max: 10 } },
        },
      },
      pollsters: [
        {
          id: 'aurora',
          name: 'Aurora Public Opinion',
          tagline: 'Reading the temper of the realm.',
          methodology: 'Uses climate-weighted vote shares.',
          leader: 'yellow',
          marginOfError: 0.035,
          houseEffect: { party: 'yellow', points: 1.2 },
          voteShares: { yellow: 0.424, orange: 0.272, red: 0.12, blue: 0.1, white: 0.05, purple: 0.034 },
          seats: {
            assembly: { yellow: 10, orange: 5, red: 2, blue: 2, white: 1, purple: 0 },
            prelates: { yellow: 4, orange: 2, red: 1, blue: 1, white: 0, purple: 0 },
          },
        },
      ],
    }
    const regionalPolling = {
      scope: 'regional',
      scopeKey: 'Capital Region',
      scopeLabel: 'Capital Region',
      aggregate: {
        voteShares: { yellow: 0.31, orange: 0.39, red: 0.12, blue: 0.09, white: 0.05, purple: 0.04 },
        seats: {
          assembly: { yellow: 3, orange: 4, red: 1, blue: 1, white: 0, purple: 0 },
          prelates: { yellow: 2, orange: 2, red: 1, blue: 1, white: 0, purple: 0 },
        },
        leader: 'orange',
        spread: {
          voteShareRangePct: { orange: { min: 36, max: 41 } },
          assemblySeatRange: { orange: { min: 3, max: 5 } },
        },
      },
      pollsters: [],
    }

    mockChatResponse('<think>panel prep</think>\nHOST: The poll board opens with Divinus Sol ahead.\n\nPOLLING EDITOR: The aggregate shows a lead.\n\nDATA ANALYST: Aurora is near the top of the range.\n\nFIELD ANALYST: Rail politics explains the movement.\n\nCAMPAIGN STRATEGIST: The path runs through assembly seats.\n\nHOST: The unanswered question is turnout.')

    const text = await requestPollBreakdown({
      results: sampleResults(),
      baselineResults: sampleBaselineResults(),
      polling,
      pollingScopes: [polling, regionalPolling],
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'google/gemma-4-e4b',
    })

    const body = lastRequestBody()
    const userPayload = JSON.parse(body.input)

    expect(body.temperature).toBe(0.58)
    expect(body.max_output_tokens).toBe(1800)
    expect(body.system_prompt).toContain('roundtable')
    expect(body.system_prompt).toContain('pre-election polling segment')
    expect(body.system_prompt).toContain('news of the nation')
    expect(body.system_prompt).toContain('surprising')
    expect(userPayload.task).toContain('national pre-election poll picture')
    expect(userPayload.scenarioContext.phase).toBe('pre_election')
    expect(userPayload.scenarioContext.priorElectionMeaning).toContain('prior election')
    expect(userPayload.interpretationRules.join(' ')).toContain('Do not report the current scenario as finished election results')
    expect(userPayload.format[0]).toContain('news of the nation')
    expect(userPayload.partyIdentityRules.find((party) => party.id === 'orange')).toMatchObject({
      canonicalName: 'United Workers Congress',
      abbreviation: 'UWC',
      colorLabel: 'Orange Party',
    })
    expect(userPayload.partyIdentityRules.find((party) => party.id === 'orange').aliases).toEqual(expect.arrayContaining([
      'orange',
      'United Workers Congress',
      'UWC',
      'Orange Party',
    ]))
    expect(userPayload.activeTrends[0]).toMatchObject({ label: 'Rail Opening', templateId: 'rail-opening' })
    expect(userPayload.priorElectionContext).toMatchObject({
      label: 'Prior election/reference baseline',
      nationalAssembly: { votePct: { yellow: 36, orange: 34 } },
    })
    expect(userPayload.preElectionStateOfPlay).toMatchObject({
      label: 'Current pre-election projection/state of play',
      assembly: { votePct: { yellow: 42, orange: 28 } },
    })
    expect(userPayload.nationalContext.assembly.votePct.yellow).toBe(42)
    expect(userPayload.allScopePolling).toHaveLength(2)
    expect(userPayload.allScopePolling[1]).toMatchObject({
      scope: 'regional',
      scopeLabel: 'Capital Region',
      aggregate: { leader: 'orange' },
    })
    expect(userPayload.allScopePolling[1].aggregate.voteSharesPct.orange).toBe(39)
    expect(userPayload.surprisingPolls[0]).toMatchObject({
      scopeLabel: 'Capital Region',
      leader: 'orange',
    })
    expect(userPayload.surprisingPolls[0].reasons.join(' ')).toContain('Breaks from the national')
    expect(userPayload.polling.aggregate.voteSharesPct.yellow).toBe(41.2)
    expect(userPayload.polling.priorElection.assemblyVotePct.yellow).toBe(36)
    expect(userPayload.polling.changeFromPriorElectionPct.yellow).toBe(5.2)
    expect(userPayload.polling.spread.voteShareRangePct.yellow).toMatchObject({ min: 39.8, max: 42.4 })
    expect(userPayload.polling.pollsters[0]).toMatchObject({
      name: 'Aurora Public Opinion',
      marginOfErrorPct: 3.5,
      houseEffect: { party: 'yellow', points: 1.2 },
    })
    expect(userPayload.polling.pollsters[0].projectedSeats.assembly.yellow).toBe(10)
    expect(text).not.toContain('<think>')
    expect(text).toContain('HOST:')
  })

  it('frames baseline poll breakdowns as an upcoming election instead of a past-results segment', async () => {
    const baseline = sampleBaselineResults()
    baseline.config = {
      ...baseline.config,
      seed: 'baseline',
      jitterSeed: 'baseline',
      trendPackageId: 'baseline',
      scenarioName: 'Baseline Election Climate',
      scenarioDescription: 'No randomized climate trends are active.',
    }
    const polling = {
      scope: 'national',
      scopeKey: 'national',
      scopeLabel: 'National',
      aggregate: {
        voteShares: { yellow: 0.36, orange: 0.34, red: 0.12, blue: 0.1, white: 0.05, purple: 0.03 },
        seats: {
          assembly: { yellow: 8, orange: 7, red: 3, blue: 2, white: 0, purple: 0 },
          prelates: { yellow: 3, orange: 3, red: 1, blue: 1, white: 0, purple: 0 },
        },
        leader: 'yellow',
      },
      pollsters: [],
    }

    mockChatResponse('HOST: The baseline poll board sets up the upcoming election.\n\nPOLLING EDITOR: The aggregate is close.\n\nDATA ANALYST: Regional boards are steady.\n\nFIELD ANALYST: No active trends dominate.\n\nCAMPAIGN STRATEGIST: The path is narrow.\n\nHOST: Turnout is next.')

    await requestPollBreakdown({
      results: baseline,
      baselineResults: baseline,
      polling,
      pollingScopes: [polling],
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'google/gemma-4-e4b',
    })

    const body = lastRequestBody()
    const userPayload = JSON.parse(body.input)

    expect(body.system_prompt).toContain('BASELINE SCENARIO')
    expect(userPayload.scenarioContext).toMatchObject({
      phase: 'pre_election',
      isBaselineScenario: true,
      currentScenario: { name: 'Baseline Election Climate', trendPackageId: 'baseline', trendCount: 0 },
    })
    expect(userPayload.scenarioContext.guidance).toContain('emphasize the upcoming election poll picture')
    expect(userPayload.interpretationRules.join(' ')).toContain('keep prior-election comparisons light')
    expect(userPayload.activeTrends).toEqual([])
    expect(userPayload.polling.priorElection.assemblyVotePct.orange).toBe(34)
    expect(userPayload.polling.changeFromPriorElectionPct.orange).toBe(0)
  })

  it('sends provincial scope and targetName to the broadcast prompt', async () => {
    mockChatResponse('Angkor Thom council is called.\n\nThe county math follows.\n\nRail Works swung hard.\n\nThe margin is narrow.\n\nThe province is stable.')

    const text = await requestElectionBroadcast({
      results: sampleResults(),
      baselineResults: sampleBaselineResults(),
      scope: 'provincial',
      targetName: 'Angkor Thom',
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'google/gemma-4-e4b',
    })

    const body = lastRequestBody()
    const systemContent = body.system_prompt
    const userPayload = JSON.parse(body.input)

    expect(systemContent).toContain('Angkor Thom')
    expect(systemContent).toContain('Stay inside Angkor Thom')
    expect(userPayload.scope).toBe('provincial')
    expect(userPayload.scopeBoundary).toContain('Angkor Thom')
    expect(userPayload.national).toBeUndefined()
    expect(userPayload.focus.type).toBe('provincial')
    expect(userPayload.focus.province.name).toBe('Angkor Thom')
    expect(userPayload.focus.counties[0].name).toBe('Rail Works')
    expect(text).toContain('Angkor Thom council')
  })

  it('strips think blocks from broadcast and ticker responses', async () => {
    mockChatResponse('<think>\nInternal reasoning about the election.\n</think>\nThe empire has voted.\n\nThe numbers are in.\n\nDivinus Sol leads.\n\nThe count is final.\n\nThe mandate holds.')

    const broadcastText = await requestElectionBroadcast({
      results: sampleResults(),
      baselineResults: sampleBaselineResults(),
      scope: 'national',
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'google/gemma-4-e4b',
    })

    expect(broadcastText).not.toContain('<think>')
    expect(broadcastText).not.toContain('Internal reasoning')
    expect(broadcastText).toContain('The empire has voted')

    vi.restoreAllMocks()
    mockChatResponse('<think>reasoning</think>\nRESULT: Divinus Sol holds the board.')

    const tickerItems = await requestElectionTicker({
      results: sampleResults(),
      baselineResults: sampleBaselineResults(),
      scope: 'national',
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'google/gemma-4-e4b',
    })

    expect(Array.isArray(tickerItems)).toBe(true)
    expect(tickerItems[0].text).not.toContain('<think>')
    expect(tickerItems[0].text).not.toContain('reasoning')
    expect(tickerItems[0]).toMatchObject({ tag: 'RESULT', tone: 'gold', text: 'Divinus Sol holds the board.' })
  })

  it('survives malformed JSON in an SSE data line without crashing the stream', async () => {
    const encoder = new TextEncoder()
    const corruptBlock = 'event: message\ndata: not-valid-json\n\n'
    const goodEvent = (type, data) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`
    const streamText = [
      goodEvent('chat.start', { model_instance_id: 'google/gemma-4-e4b' }),
      corruptBlock,
      goodEvent('message.start', {}),
      goodEvent('message.delta', { content: 'Divinus Sol projected.' }),
      goodEvent('message.end', {}),
      goodEvent('chat.end', {
        result: {
          model_instance_id: 'google/gemma-4-e4b',
          output: [{ type: 'message', content: 'Divinus Sol projected.' }],
          stats: { input_tokens: 50, total_output_tokens: 10 },
        },
      }),
    ].join('')

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(streamText))
          controller.close()
        },
      }),
      text: async () => streamText,
    })

    const text = await requestElectionBroadcast({
      results: sampleResults(),
      baselineResults: sampleBaselineResults(),
      scope: 'national',
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'google/gemma-4-e4b',
    })

    expect(text).toBe('Divinus Sol projected.')
  })

  it('requests multiple tagged ticker headlines and parses them into items', async () => {
    mockChatResponse([
      'RESULT: Divinus Sol holds the national board with a clear plurality.',
      'UPSET: The opposition beat its polls by four points in the capital.',
      'TREND: Rail politics kept the industrial corridor steady.',
      '- OUTLOOK: A council fight looms as the new term opens.',
    ].join('\n'))
    const statuses = []

    const items = await requestElectionTicker({
      results: sampleResults(),
      baselineResults: sampleBaselineResults(),
      scope: 'overview',
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'google/gemma-4-e4b',
      onStatus: (status) => statuses.push(status),
    })

    const body = lastRequestBody()
    const systemContent = body.system_prompt
    const userPayload = JSON.parse(body.input)

    expect(body.temperature).toBe(0.5)
    expect(body.max_output_tokens).toBe(700)
    expect(systemContent).toContain('4 to 6 separate ticker headlines')
    expect(items).toHaveLength(4)
    expect(items[0]).toMatchObject({ tag: 'RESULT', tone: 'gold' })
    expect(items[1]).toMatchObject({ tag: 'UPSET', tone: 'coral' })
    expect(items[2]).toMatchObject({ tag: 'TREND', tone: 'jade' })
    // Leading bullet markers are stripped before the tag is parsed.
    expect(items[3]).toMatchObject({ tag: 'OUTLOOK', tone: 'ink', text: 'A council fight looms as the new term opens.' })
    expect(userPayload.scope).toBe('overview')
    expect(userPayload.scopeBoundary).toContain('only ticker allowed to consolidate')
    expect(userPayload.focus.type).toBe('overview')
    expect(userPayload.focus.regionalOverview[0]).toMatchObject({ name: 'Capital Region' })
    expect(userPayload.focus.provinceHighlights[0]).toMatchObject({ name: 'Angkor Thom' })
    expect(userPayload.activeTrends[0]).toMatchObject({ label: 'Rail Opening' })
    expect(statuses.map((status) => status.eventType)).toEqual([
      'app.preparing',
      'app.connecting',
      'chat.start',
      'model_load.start',
      'model_load.progress',
      'model_load.end',
      'prompt_processing.start',
      'prompt_processing.progress',
      'prompt_processing.end',
      'message.start',
      'message.delta',
      'message.end',
      'chat.end',
      'app.complete',
    ])
    expect(statuses.find((status) => status.eventType === 'model_load.progress')).toMatchObject({
      nativeProgress: 0.65,
      label: 'model_load.progress',
    })
    expect(statuses.every((status) => Number.isFinite(status.timestamp))).toBe(true)
    expect(items.every((item) => typeof item.text === 'string' && item.text.length)).toBe(true)
  })

  it('defaults all LLM calls to google/gemma-4-e4b and the native LM Studio chat endpoint', async () => {
    expect(DEFAULT_MODEL).toBe('google/gemma-4-e4b')
    expect(DEFAULT_ENDPOINT).toBe('http://localhost:1234/api/v1/chat')

    mockChatResponse(JSON.stringify({
      givenMale: ['Sokha', 'Vannak'],
      givenFemale: ['Bopha', 'Chhaya'],
      surnames: ['Prak', 'Chan'],
    }))

    const names = await requestCultureNames({
      label: 'Khmer',
      categories: ['givenMale', 'givenFemale', 'surnames'],
      count: 2,
    })

    const fetchCall = globalThis.fetch.mock.calls.at(-1)
    const body = lastRequestBody()
    const userPayload = JSON.parse(body.input)

    expect(fetchCall[0]).toBe(DEFAULT_ENDPOINT)
    expect(body.model).toBe('google/gemma-4-e4b')
    expect(body.stream).toBe(true)
    expect(body.store).toBe(false)
    expect(body.max_output_tokens).toBe(2000)
    expect(userPayload.cultureLabel).toBe('Khmer')
    expect(userPayload.requestedCategories).toHaveProperty('givenMale')
    expect(names).toEqual({
      givenMale: ['Sokha', 'Vannak'],
      givenFemale: ['Bopha', 'Chhaya'],
      surnames: ['Prak', 'Chan'],
    })
  })

  it('generates representative names with the structured gemma-4-e4b prompt and normalizes nested maps', async () => {
    mockChatResponse(JSON.stringify({
      names: {
        yellow_0: 'Sokha Prak',
        orange_0: 'David Kim',
      },
    }))

    const statuses = []
    const repNames = await requestRepresentativeNames({
      seatDetails: [
        { party: 'yellow', seatIndex: 0, jurisdiction: 'Angkor Thom', supportMetric: 68 },
        { party: 'orange', seatIndex: 0, jurisdiction: 'Angkor Thom', supportMetric: 52 },
      ],
      provinces: sampleWorld().provinces,
      countryData: sampleWorld().country,
      scope: 'national',
      onStatus: (status) => statuses.push(status),
    })

    const body = lastRequestBody()
    const userPayload = JSON.parse(body.input)

    expect(body.model).toBe('google/gemma-4-e4b')
    expect(body.max_output_tokens).toBe(2000)
    expect(userPayload.seatsToName).toHaveLength(2)
    expect(userPayload.seatsToName[0]).toMatchObject({ key: 'yellow_0', place: 'Angkor Thom' })
    expect(repNames).toEqual({
      yellow_0: 'Sokha Prak',
      orange_0: 'David Kim',
    })
    expect(statuses.at(-1)).toMatchObject({ phase: 'complete', progress: 1 })
  })

  it('repairs malformed, commented, unescaped-quote, single-quoted, and truncated JSON without throwing JSON Parse errors', async () => {
    // 1. Gemma reasoning channel with braces + unescaped quotes + raw newline + URL with // + line comment + trailing comma
    mockChatResponse([
      '<|channel>thought\nConsidering candidate {"draft": true} for the climate name.\n<channel|>',
      '```json',
      '{',
      '  // Scenario metadata',
      '  scenarioName: "The "Monsoon" Mandate",',
      '  \'scenarioDescription\': \'King\'s coalition rallied around http://khmer.gov/rail\\nand held the industrial corridor.\',',
      '}',
      '```',
    ].join('\n'))

    const metadata = await requestElectionClimateSummary({
      trends: [sampleTrend()],
      seed: 'repair-test',
      data: sampleWorld(),
    })

    expect(metadata.name).toBe('The "Monsoon" Mandate')
    expect(metadata.description).toContain("King's coalition rallied around http://khmer.gov/rail")

    // 2. Truncated JSON array in culture naming + alias keys
    vi.restoreAllMocks()
    mockChatResponse('{"male_names": ["1. Sokha", "Vannak", "Rithy')

    const cultureNames = await requestCultureNames({
      label: 'Khmer',
      categories: ['givenMale'],
      count: 5,
    })

    expect(cultureNames.givenMale).toEqual(['Sokha', 'Vannak', 'Rithy'])
  })

  it('retries narrative planning and culture naming with higher token budgets when an initial response has no JSON', async () => {
    const encoder = new TextEncoder()
    const makeStream = (content) => {
      const event = (type, data) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`
      const text = [
        event('chat.start', { model_instance_id: 'google/gemma-4-e4b' }),
        event('message.delta', { content }),
        event('chat.end', { result: { output: [{ type: 'message', content }] } }),
      ].join('')
      return {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(text))
            controller.close()
          },
        }),
        text: async () => text,
      }
    }

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(makeStream('Thinking through the prompt without emitting JSON...'))
      .mockResolvedValueOnce(makeStream(JSON.stringify({
        title: 'Recovered Plan',
        summary: 'Succeeded on retry.',
        selections: [{ id: 'rail-opening', intensity: 0.5 }],
      })))

    const { plan, packageDef } = await requestElectionNarrativePlan({
      narrative: 'Rail recovery',
      data: sampleWorld(),
    })

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body).max_output_tokens).toBe(1700)
    expect(JSON.parse(fetchSpy.mock.calls[1][1].body).max_output_tokens).toBe(2400)
    expect(plan.title).toBe('Recovered Plan')
    expect(packageDef.trends[0].templateId).toBe('rail-opening')
  })

  it('requests narrative-driven political model weights with empire context and compiles scoped party weights', async () => {
    mockChatResponse(JSON.stringify({
      title: 'Rail Labor vs Imperial Core',
      summary: 'Industrial rail workers back UWC while Divinus Sol holds the sacred capital.',
      partyWeights: {
        yellow: {
          rationale: 'Backed by the imperial capital and state religion.',
          bias: 0.09,
          affinities: {
            imperial_core_index: 0.26,
            state_religion_share: 0.16,
            conquered_index: -0.2,
          },
        },
        orange: {
          rationale: 'Rallies rail and industrial counties.',
          bias: 0.12,
          affinities: {
            industrial_index: 0.34,
            urbanization_index: 0.22,
          },
        },
      },
    }))

    const statuses = []
    const result = await requestPoliticalModelWeights({
      narrative: 'Rail workers surge for Orange while Yellow holds the capital.',
      data: sampleWorld(),
      onStatus: (status) => statuses.push(status),
    })

    const fetchCall = globalThis.fetch.mock.calls.at(-1)
    const body = lastRequestBody()
    const userPayload = JSON.parse(body.input)

    expect(fetchCall[0]).toBe(DEFAULT_ENDPOINT)
    expect(body.model).toBe('google/gemma-4-e4b')
    expect(body.max_output_tokens).toBe(2200)
    expect(userPayload.USER_NARRATIVE).toContain('Rail workers surge for Orange')
    expect(userPayload.CURRENT_WORLD.country).toMatchObject({ name: 'Khmer Empire', leader: 'Jayavarman VII' })
    expect(userPayload.EMPIRE_FEATURE_PROFILE).toHaveProperty('strongestCleavages')
    expect(userPayload.ALLOWED_FEATURES).toHaveProperty('Economy')
    expect(result.title).toBe('Rail Labor vs Imperial Core')
    expect(result.summary).toContain('Industrial rail workers')
    const orange = result.model.find((entry) => entry.id === 'orange')
    expect(orange.affinities.province.industrial_index).toBe(0.34)
    expect(orange.affinities.county.urban_index).toBe(0.22)
    expect(statuses.at(-1)).toMatchObject({ phase: 'complete', progress: 1 })
  })

  it('requests narrative-driven voter blocs with empire demographic context and compiles originCountry, group, and religion blocs', async () => {
    mockChatResponse(JSON.stringify({
      title: 'Temple & Frontier Identity Coalitions',
      summary: 'Zoroastrian faithful rally behind Divinus Sol while Capital Region rail guilds lean toward UWC.',
      voterBlocs: [
        {
          id: 'zoroastrian_faithful',
          label: 'Zoroastrian Faithful',
          party: 'Divinus Sol',
          matchBy: 'religion',
          religion: 'Zoroastrianism',
          strength: { county: 0.25, province: 0.35, national: 0.18 },
          rationale: 'Devout followers of the state religion form the core Divinus Sol constituency.',
        },
        {
          id: 'capital_rail_guilds',
          label: 'Capital Rail Guilds',
          party: 'UWC',
          matchBy: 'group',
          contains: 'Capital Region',
          strength: { county: 0.45, province: 0.3, national: 0.12 },
          rationale: 'Organized industrial workers in the Capital Region mobilize for UWC.',
        },
      ],
    }))

    const statuses = []
    const result = await requestNarrativeVoterBlocs({
      narrative: 'Zoroastrian faithful back Divinus Sol while Capital Region workers organize for UWC.',
      data: sampleWorld(),
      onStatus: (status) => statuses.push(status),
    })

    const fetchCall = globalThis.fetch.mock.calls.at(-1)
    const body = lastRequestBody()
    const userPayload = JSON.parse(body.input)

    expect(fetchCall[0]).toBe(DEFAULT_ENDPOINT)
    expect(body.model).toBe('google/gemma-4-e4b')
    expect(body.max_output_tokens).toBe(2000)
    expect(userPayload.USER_NARRATIVE).toContain('Zoroastrian faithful back Divinus Sol')
    expect(userPayload.CURRENT_WORLD.country).toMatchObject({ name: 'Khmer Empire', leader: 'Jayavarman VII' })
    expect(userPayload.DEMOGRAPHIC_BLOC_OPTIONS.availableReligions[0]).toMatchObject({
      name: 'Zoroastrianism',
      isStateReligion: true,
    })
    expect(userPayload.DEMOGRAPHIC_BLOC_OPTIONS.availableProvinceGroups[0]).toMatchObject({
      name: 'Capital Region',
    })
    expect(result.title).toBe('Temple & Frontier Identity Coalitions')
    expect(result.voterBlocs).toHaveLength(2)
    expect(result.voterBlocs[0]).toMatchObject({
      id: 'zoroastrian_faithful',
      label: 'Zoroastrian Faithful',
      party: 'yellow',
      source: { religion: 'Zoroastrianism' },
      strength: { county: 0.25, province: 0.35, national: 0.18 },
    })
    expect(result.voterBlocs[1]).toMatchObject({
      id: 'capital_rail_guilds',
      label: 'Capital Rail Guilds',
      party: 'orange',
      source: { selector: { groupIncludes: ['Capital Region'] } },
      strength: { county: 0.45, province: 0.3, national: 0.12 },
    })
    expect(statuses.at(-1)).toMatchObject({ phase: 'complete', progress: 1 })
  })

  it('honors an explicit matchBy when the model echoes placeholder fields from the output format', () => {
    const blocs = compileNarrativeVoterBlocs({
      voterBlocs: [
        {
          id: 'maya_homeland',
          party: 'purple',
          matchBy: 'originalCountry',
          matchValues: ['Maya'],
          religion: 'Religion name when matchBy is religion',
          strength: { county: 0.3, province: 0.3, national: 0.1 },
        },
        {
          id: 'capital_guilds',
          party: 'orange',
          matchBy: 'group',
          matchValues: ['Capital Region'],
          religion: 'Zoroastrianism',
          originalCountryIncludes: ['Khmer'],
          strength: 0.2,
        },
      ],
    }, sampleWorld())

    expect(blocs[0].source).toEqual({ selector: { originalCountryIncludes: ['Maya'] } })
    expect(blocs[1].source).toEqual({ selector: { groupIncludes: ['Capital Region'] } })
  })
})
