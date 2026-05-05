import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import NationalElectionResults from './NationalElectionResults.vue'
import ElectionOverview from './ElectionOverview.vue'
import PreElectionPage from './PreElectionPage.vue'
import ProvincialElectionResults from './ProvincialElectionResults.vue'
import RegionalElectionResults from './RegionalElectionResults.vue'
import { useElectionStore } from '../stores/electionStore'
import { useFormStore } from '../stores/formStore'
import { useUiStore } from '../stores/uiStore'

function sampleTemplate() {
  return {
    country: {
      basic_info: { name: 'Test Empire', leader: 'Leader' },
      state_religion: 'Zoroastrianism',
    },
    province_groups: ['Capital Region', 'Federation of American Provinces'],
    global_religions: ['Zoroastrianism', 'Taoism'],
    provinces: [
      {
        name: 'Capital',
        group: 'Capital Region',
        is_national_capital: true,
        is_regional_capital: true,
        is_founded: true,
        population: 12,
        loyalty: 50,
        growth_percentage: 110,
        happiness_percentage: 115,
        net_amenities: 7,
        yields: { food: 35, production: 40, gold: 80, culture: 55, science: 48, faith: 30 },
        religions: [{ name: 'Zoroastrianism', followers: 10 }, { name: 'Taoism', followers: 1 }],
        counties: [
          {
            name: 'Forum',
            tile_id: 'tile_1',
            distance_from_center: 0,
            terrain: 'Grassland',
            improvement: { name: 'City Center', buildings: { Monument: true }, great_works: { Epic: true } },
            features: {},
            citizens_working: 3,
            river: true,
            has_railroad: true,
            appeal: 5,
            yields: { food: 5, production: 5, gold: 8, culture: 8, science: 5, faith: 4 },
          },
        ],
      },
      {
        name: 'Boston',
        group: 'Federation of American Provinces',
        is_conquered: true,
        population: 8,
        loyalty: 28,
        growth_percentage: 90,
        happiness_percentage: 85,
        net_amenities: 1,
        yields: { food: 24, production: 20, gold: 45, culture: 20, science: 18, faith: 8 },
        religions: [{ name: 'Zoroastrianism', followers: 4 }, { name: 'Taoism', followers: 2 }],
        counties: [
          {
            name: 'Harbor',
            tile_id: 'tile_1',
            distance_from_center: 1,
            terrain: 'Coast',
            improvement: { name: 'Commercial Hub', buildings: { Market: true, Bank: true }, great_works: {} },
            features: {},
            citizens_working: 2,
            river: true,
            has_railroad: false,
            appeal: 4,
            yields: { food: 3, production: 2, gold: 12, culture: 3, science: 2, faith: 1 },
          },
        ],
      },
    ],
  }
}

function mountPage(component, withData = true) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(component, {
    global: {
      plugins: [pinia],
      stubs: {
        ProvinceChart: {
          props: ['option'],
          template: '<div data-test="province-chart">{{ option.series ? option.series.length : 0 }}</div>',
        },
      },
    },
  })
  const store = useFormStore()
  if (withData) store.loadTemplate(sampleTemplate(), { silent: true })
  return { wrapper, store, electionStore: useElectionStore() }
}

function nativeChatResponse(content) {
  const encoder = new TextEncoder()
  const event = (type, data) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`
  const streamText = [
    event('chat.start', { model_instance_id: 'qwen/qwen3.5-9b' }),
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
        stats: { input_tokens: 100, total_output_tokens: 30 },
      },
    }),
  ].join('')

  return {
    ok: true,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(streamText))
        controller.close()
      },
    }),
    text: async () => streamText,
  }
}

describe('election result pages', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders a national empty state', () => {
    const { wrapper } = mountPage(NationalElectionResults, false)

    expect(wrapper.text()).toContain('No Election Data')
  })

  it('renders national chamber detail without the climate controls', async () => {
    const { wrapper } = mountPage(NationalElectionResults)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('National Vote And Seats')
    expect(wrapper.text()).toContain('Vote, Seats, And Thresholds')
    expect(wrapper.text()).toContain('Prelate Delegation By Province')
    expect(wrapper.text()).toContain('Thresholds And Apportionment')
    expect(wrapper.text()).toContain('Divinus Sol')
    expect(wrapper.text()).not.toContain('Randomize Election Climate')
    expect(wrapper.text()).not.toContain('Party Strength By Region')
  })

  it('renders pre-election climate controls and polls', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(nativeChatResponse(''))
      .mockResolvedValueOnce(nativeChatResponse(JSON.stringify({
        scenario: {
          scenario_name: 'Breadline Backlash',
          scenario_description: 'Cost pressures and local unrest define the randomized climate.',
        },
      })))
    vi.stubGlobal('fetch', fetchMock)

    const { wrapper, electionStore } = mountPage(PreElectionPage)
    const uiStore = useUiStore()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Pre-Election')
    expect(wrapper.text()).toContain('Election Climate')
    expect(wrapper.text()).toContain('Election Polls')
    expect(wrapper.text()).toContain('Concord of Pollsters')
    expect(wrapper.text()).toContain('Aurora Public Opinion')
    expect(wrapper.text()).toContain('Mandate Memory Research')
    expect(wrapper.text()).toContain('Chamberline Analytics')
    expect(wrapper.text()).toContain('Asm Total')
    expect(wrapper.text()).toContain('Council Total')
    expect(wrapper.findAll('.pollster-card')).toHaveLength(6)
    expect(wrapper.findAll('.pollster-party-row')).toHaveLength(42)
    expect(wrapper.text()).toContain('Start Poll Breakdown')

    const pollBreakdownButton = wrapper.findAll('button').find((button) => button.text().includes('Start Poll Breakdown'))
    await pollBreakdownButton.trigger('click')

    expect(uiStore.pollBreakdownModalOpen).toBe(true)

    const climateButton = wrapper.findAll('button').find((button) => button.text().includes('Randomize Election Climate'))
    await climateButton.trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(0)
    expect(electionStore.trends.length).toBeGreaterThan(0)

    await wrapper.get('.btn-ai').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(electionStore.scenarioName).toBe('Breadline Backlash')
    expect(wrapper.text()).toContain('Breadline Backlash')
  })

  it('renders the election overview board', async () => {
    const { wrapper } = mountPage(ElectionOverview)
    const uiStore = useUiStore()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Election Board')
    expect(wrapper.text()).toContain('Assembly of the Empire')
    expect(wrapper.text()).toContain('Council of Prelates')
    expect(wrapper.text()).toContain('Regional Control')
    expect(wrapper.text()).toContain('Provincial Control')

    await wrapper.get('.btn-broadcast-start').trigger('click')
    expect(uiStore.broadcastScope).toBe('overview')
  })

  it('renders regional selected-region detail tables', async () => {
    const { wrapper } = mountPage(RegionalElectionResults)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Regional Political Profile')
    expect(wrapper.text()).toContain('Province-Level Returns')
    expect(wrapper.text()).toContain('Capital Region')
    expect(wrapper.text()).not.toContain('Control Of Regional Houses')
  })

  it('renders provincial county result inputs', async () => {
    const { wrapper } = mountPage(ProvincialElectionResults)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('County Results')
    expect(wrapper.text()).toContain('Forum')
    expect(wrapper.text()).not.toContain('Control Of Provincial Houses')
  })
})
