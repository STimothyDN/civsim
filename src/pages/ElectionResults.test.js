import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import NationalElectionResults from './NationalElectionResults.vue'
import ElectionOverview from './ElectionOverview.vue'
import ProvincialElectionResults from './ProvincialElectionResults.vue'
import RegionalElectionResults from './RegionalElectionResults.vue'
import { useElectionStore } from '../stores/electionStore'
import { useFormStore } from '../stores/formStore'

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

describe('election result pages', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders a national empty state', () => {
    const { wrapper } = mountPage(NationalElectionResults, false)

    expect(wrapper.text()).toContain('No Election Data')
  })

  it('renders national results and randomizes the election climate', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '',
                reasoning_content: 'Thinking through the climate...',
              },
              finish_reason: 'length',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  scenario: {
                    scenario_name: 'Breadline Backlash',
                    scenario_description: 'Cost pressures and local unrest define the randomized climate.',
                  },
                }),
              },
            },
          ],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const { wrapper, electionStore } = mountPage(NationalElectionResults)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('National Vote And Seats')
    expect(wrapper.text()).toContain('Assembly of the Empire')
    expect(wrapper.text()).toContain('Council of Prelates')
    expect(wrapper.text()).toContain('Divinus Sol')

    await wrapper.get('.btn-primary').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(electionStore.trends.length).toBeGreaterThan(0)
    expect(electionStore.scenarioName).toBe('Breadline Backlash')
    expect(wrapper.text()).toContain('Breadline Backlash')
  })

  it('renders the election overview board', async () => {
    const { wrapper } = mountPage(ElectionOverview)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Election Board')
    expect(wrapper.text()).toContain('Assembly of the Empire')
    expect(wrapper.text()).toContain('Council of Prelates')
    expect(wrapper.text()).toContain('Regional Calls')
  })

  it('renders regional result tables', async () => {
    const { wrapper } = mountPage(RegionalElectionResults)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Seat Allocation By Region')
    expect(wrapper.text()).toContain('Capital Region')
  })

  it('renders provincial county result inputs', async () => {
    const { wrapper } = mountPage(ProvincialElectionResults)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('County Results')
    expect(wrapper.text()).toContain('Forum')
  })
})
