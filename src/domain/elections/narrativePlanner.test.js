import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  requestElectionBroadcast,
  requestElectionClimateSummary,
  requestElectionTicker,
  requestElectionNarrativePlan,
} from './narrativePlanner'

function mockChatResponse(content) {
  const encoder = new TextEncoder()
  const event = (type, data) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`
  const streamText = [
    event('chat.start', { model_instance_id: 'qwen/qwen3.5-9b' }),
    event('model_load.start', { model_instance_id: 'qwen/qwen3.5-9b' }),
    event('model_load.progress', { model_instance_id: 'qwen/qwen3.5-9b', progress: 0.65 }),
    event('model_load.end', { model_instance_id: 'qwen/qwen3.5-9b', load_time_seconds: 1.2 }),
    event('prompt_processing.start', {}),
    event('prompt_processing.progress', { progress: 0.5 }),
    event('prompt_processing.end', {}),
    event('message.start', {}),
    event('message.delta', { content }),
    event('message.end', {}),
    event('chat.end', {
      result: {
        model_instance_id: 'qwen/qwen3.5-9b',
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
      model: 'qwen/qwen3.5-9b',
    })

    const body = lastRequestBody()
    const userPayload = JSON.parse(body.input)
    const railTemplate = userPayload.TREND_TEMPLATES.find((template) => template.id === 'rail-opening')

    expect(body.model).toBe('qwen/qwen3.5-9b')
    expect(body.max_output_tokens).toBe(1700)
    expect(body.context_length).toBe(262144)
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
              party: 'green',
              magnitude: 0.1,
            },
          ],
        },
        {
          label: 'Invalid Custom Trend',
          effects: [{ level: 'region', party: 'green', magnitude: 1 }],
        },
      ],
    }))

    const { packageDef } = await requestElectionNarrativePlan({
      narrative: 'A canal guild revolt is affecting toll counties.',
      data: sampleWorld(),
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'qwen/qwen3.5-9b',
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
      model: 'qwen/qwen3.5-9b',
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
      model: 'qwen/qwen3.5-9b',
    })

    const body = lastRequestBody()
    const userContent = body.input
    const userPayload = JSON.parse(userContent)

    expect(body.temperature).toBe(0.65)
    expect(body.max_output_tokens).toBe(2200)
    expect(userContent).not.toContain('[object Object]')
    expect(userPayload.activeTrends[0]).toMatchObject({ label: 'Rail Opening', templateId: 'rail-opening' })
    expect(userPayload.national.assembly.votePct.yellow).toBe(42)
    expect(userPayload.scopeBoundary).toContain('National page')
    expect(userPayload.focus.type).toBe('national')
    expect(userPayload.focus.regionalOverview).toBeUndefined()
    expect(userPayload.focus.examples[0].assembly.strongestSwing).toMatchObject({ party: 'yellow', points: 9 })
  })

  it('sends regional scope and targetName to the broadcast prompt', async () => {
    mockChatResponse('Capital Region assembly is called for Divinus Sol.\n\nThe regional math is clear.\n\nProvinces held the line.\n\nSwings were contained.\n\nThe region remains stable.')

    const text = await requestElectionBroadcast({
      results: sampleResults(),
      baselineResults: sampleBaselineResults(),
      scope: 'regional',
      targetName: 'Capital Region',
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'qwen/qwen3.5-9b',
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
      model: 'qwen/qwen3.5-9b',
    })

    let body = lastRequestBody()
    let userPayload = JSON.parse(body.input)

    expect(body.system_prompt).toContain('Treat polling.aggregate')
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

    vi.restoreAllMocks()
    mockChatResponse('Polls show Divinus Sol ahead, but the spread keeps the call cautious.')

    await requestElectionTicker({
      results: sampleResults(),
      baselineResults: sampleBaselineResults(),
      scope: 'national',
      polling,
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'qwen/qwen3.5-9b',
    })

    body = lastRequestBody()
    userPayload = JSON.parse(body.input)

    expect(body.system_prompt).toContain('Treat polling.aggregate')
    expect(userPayload.polling.aggregate.projectedSeats.assembly.yellow).toBe(9)
    expect(userPayload.polling.spread.voteShareRangePct.yellow).toMatchObject({ min: 39.8, max: 42.4 })
  })

  it('sends provincial scope and targetName to the broadcast prompt', async () => {
    mockChatResponse('Angkor Thom council is called.\n\nThe county math follows.\n\nRail Works swung hard.\n\nThe margin is narrow.\n\nThe province is stable.')

    const text = await requestElectionBroadcast({
      results: sampleResults(),
      baselineResults: sampleBaselineResults(),
      scope: 'provincial',
      targetName: 'Angkor Thom',
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'qwen/qwen3.5-9b',
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
      model: 'qwen/qwen3.5-9b',
    })

    expect(broadcastText).not.toContain('<think>')
    expect(broadcastText).not.toContain('Internal reasoning')
    expect(broadcastText).toContain('The empire has voted')

    vi.restoreAllMocks()
    mockChatResponse('<think>reasoning</think> Divinus Sol holds the board.')

    const tickerText = await requestElectionTicker({
      results: sampleResults(),
      baselineResults: sampleBaselineResults(),
      scope: 'national',
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'qwen/qwen3.5-9b',
    })

    expect(tickerText).not.toContain('<think>')
    expect(tickerText).not.toContain('reasoning')
    expect(tickerText).toBe('Divinus Sol holds the board.')
  })

  it('survives malformed JSON in an SSE data line without crashing the stream', async () => {
    const encoder = new TextEncoder()
    const corruptBlock = 'event: message\ndata: not-valid-json\n\n'
    const goodEvent = (type, data) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`
    const streamText = [
      goodEvent('chat.start', { model_instance_id: 'qwen/qwen3.5-9b' }),
      corruptBlock,
      goodEvent('message.start', {}),
      goodEvent('message.delta', { content: 'Divinus Sol projected.' }),
      goodEvent('message.end', {}),
      goodEvent('chat.end', {
        result: {
          model_instance_id: 'qwen/qwen3.5-9b',
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
      model: 'qwen/qwen3.5-9b',
    })

    expect(text).toBe('Divinus Sol projected.')
  })

  it('uses a compact one-paragraph request for election tickers', async () => {
    mockChatResponse('Divinus Sol is holding the national board as rail politics keeps the capital steady.')
    const statuses = []

    const text = await requestElectionTicker({
      results: sampleResults(),
      baselineResults: sampleBaselineResults(),
      scope: 'overview',
      endpoint: 'http://lm.test/api/v1/chat',
      model: 'qwen/qwen3.5-9b',
      onStatus: (status) => statuses.push(status),
    })

    const body = lastRequestBody()
    const systemContent = body.system_prompt
    const userPayload = JSON.parse(body.input)

    expect(body.temperature).toBe(0.45)
    expect(body.max_output_tokens).toBe(420)
    expect(systemContent).toContain('exactly one plain-text paragraph')
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
    expect(text).toBe('Divinus Sol is holding the national board as rail politics keeps the capital steady.')
  })
})
