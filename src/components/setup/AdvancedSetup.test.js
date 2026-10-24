import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AdvancedSetup from './AdvancedSetup.vue'
import { useFormStore } from '../../stores/formStore'

function mockSseChatResponse(content) {
  const encoder = new TextEncoder()
  const event = (type, data) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`
  const streamText = [
    event('chat.start', { model_instance_id: 'google/gemma-4-e4b' }),
    event('message.start', {}),
    event('message.delta', { content }),
    event('message.end', {}),
    event('chat.end', {
      result: {
        model_instance_id: 'google/gemma-4-e4b',
        output: [{ type: 'message', content }],
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

describe('AdvancedSetup - AI Narrative Driven Weights', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens the narrative input panel, sends narrative + empire context to LM Studio, and populates party weights', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockSseChatResponse(JSON.stringify({
        title: 'Industrial Riverlands Surge',
        summary: 'Orange captures industrial counties while Yellow holds the sacred capital.',
        partyWeights: {
          yellow: {
            rationale: 'Anchors the sacred imperial capital.',
            bias: 0.08,
            affinities: {
              imperial_core_index: 0.31,
              state_religion_share: 0.19,
            },
          },
          orange: {
            rationale: 'Dominates industrial production and urban labor.',
            bias: 0.14,
            affinities: {
              industrial_index: 0.38,
              urbanization_index: 0.25,
            },
          },
        },
      })),
    )

    const store = useFormStore()
    store.loadTemplate(
      {
        country: { basic_info: { name: 'Khmer Empire', leader: 'Jayavarman VII' } },
        province_groups: ['Capital Region'],
        global_religions: ['Zoroastrianism'],
        provinces: [
          {
            name: 'Angkor Thom',
            group: 'Capital Region',
            is_national_capital: true,
            population: 12,
            counties: [
              {
                name: 'Rail Works',
                population: 6,
                terrain: 'Plains',
                improvement: { name: 'Industrial Zone', buildings: { Factory: true } },
              },
            ],
          },
        ],
      },
      { silent: true },
    )

    const wrapper = mount(AdvancedSetup)
    await flushPromises()

    const aiButton = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('AI Narrative Driven Weights'))
    expect(aiButton).toBeTruthy()

    await aiButton.trigger('click')
    await flushPromises()

    const textarea = wrapper.find('.narrative-weights-panel textarea')
    expect(textarea.exists()).toBe(true)

    await textarea.setValue('Industrial workers rally behind Orange while Yellow holds the capital.')
    const applyButton = wrapper
      .findAll('.narrative-weights-panel button')
      .find((btn) => btn.text().includes('Apply Narrative Weights'))
    await applyButton.trigger('click')
    await flushPromises()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const requestBody = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(requestBody.model).toBe('google/gemma-4-e4b')

    const orangeParty = store.currentData.config.parties.find((p) => p.id === 'orange')
    expect(orangeParty.affinities.province.industrial_index).toBe(0.38)
    expect(orangeParty.affinities.county.urban_index).toBe(0.25)
    expect(wrapper.text()).toContain('Industrial Riverlands Surge')
    expect(wrapper.text()).toContain('Dominates industrial production and urban labor.')
  })

  it('populates voter blocs on the Voter Blocs tab via the AI Narrative Driven Voter Blocs button', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockSseChatResponse(JSON.stringify({
        title: 'Conquered Maya & Sacred Sol Blocs',
        summary: 'Former Maya provinces back PPP while Zoroastrian faithful vote Divinus Sol.',
        voterBlocs: [
          {
            id: 'maya_homeland',
            label: 'Maya Homeland',
            party: 'purple',
            matchBy: 'originalCountry',
            contains: ['Maya'],
            strength: { county: 0.42, province: 0.36, national: 0.14 },
            rationale: 'Annexed Maya provinces organize around regional autonomy.',
          },
          {
            id: 'sol_faithful',
            label: 'Zoroastrian Faithful',
            party: 'yellow',
            matchBy: 'religion',
            religion: 'Zoroastrianism',
            strength: { county: 0.22, province: 0.31, national: 0.16 },
            rationale: 'Temple followers remain loyal to Divinus Sol.',
          },
        ],
      })),
    )

    const store = useFormStore()
    store.loadTemplate(
      {
        country: { basic_info: { name: 'Khmer Empire', leader: 'Jayavarman VII' } },
        province_groups: ['Capital Region', 'Maya Frontier'],
        global_religions: ['Zoroastrianism'],
        provinces: [
          {
            name: 'Tikal',
            group: 'Maya Frontier',
            original_country: 'Maya',
            is_conquered: true,
            population: 10,
            religions: [{ name: 'Zoroastrianism', followers: 6 }],
            counties: [
              {
                name: 'Jungle Terrace',
                population: 5,
                terrain: 'Plains',
              },
            ],
          },
        ],
      },
      { silent: true },
    )

    const wrapper = mount(AdvancedSetup)
    await flushPromises()

    const blocsTabButton = wrapper
      .findAll('.advanced-tab')
      .find((btn) => btn.text().includes('Voter Blocs'))
    expect(blocsTabButton).toBeTruthy()
    await blocsTabButton.trigger('click')
    await flushPromises()

    const aiBlocsButton = wrapper
      .findAll('button')
      .find((btn) => btn.text().includes('AI Narrative Driven Voter Blocs'))
    expect(aiBlocsButton).toBeTruthy()

    await aiBlocsButton.trigger('click')
    await flushPromises()

    const textarea = wrapper.find('.narrative-weights-panel textarea')
    expect(textarea.exists()).toBe(true)

    await textarea.setValue('Former Maya provinces vote for Purple while Zoroastrian faithful support Yellow.')
    const applyButton = wrapper
      .findAll('.narrative-weights-panel button')
      .find((btn) => btn.text().includes('Apply Narrative Voter Blocs'))
    await applyButton.trigger('click')
    await flushPromises()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const requestBody = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(requestBody.model).toBe('google/gemma-4-e4b')

    expect(store.currentData.config.voterBlocs).toHaveLength(2)
    expect(store.currentData.config.voterBlocs[0]).toMatchObject({
      id: 'maya_homeland',
      label: 'Maya Homeland',
      party: 'purple',
      source: { selector: { originalCountryIncludes: ['Maya'] } },
      strength: { county: 0.42, province: 0.36, national: 0.14 },
    })
    expect(store.currentData.config.voterBlocs[1]).toMatchObject({
      id: 'sol_faithful',
      label: 'Zoroastrian Faithful',
      party: 'yellow',
      source: { religion: 'Zoroastrianism' },
      strength: { county: 0.22, province: 0.31, national: 0.16 },
    })
    expect(wrapper.text()).toContain('Conquered Maya & Sacred Sol Blocs')
    expect(wrapper.text()).toContain('Annexed Maya provinces organize around regional autonomy.')
  })
})
