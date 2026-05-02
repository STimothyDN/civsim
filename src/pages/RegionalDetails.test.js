import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import RegionalDetails from './RegionalDetails.vue'
import { useFormStore } from '../stores/formStore'

function mountPage() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(RegionalDetails, {
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
  return { wrapper, store: useFormStore() }
}

describe('RegionalDetails', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders an empty state without regional data', () => {
    const { wrapper } = mountPage()

    expect(wrapper.text()).toContain('No Regional Data')
  })

  it('renders regional decision desk charts for loaded data', async () => {
    const { wrapper, store } = mountPage()
    store.loadTemplate(
      {
        country: { basic_info: { name: 'Test', leader: '' } },
        province_groups: ['Core', 'Frontier'],
        global_religions: ['Sun Cult'],
        provinces: [
          {
            name: 'Capital',
            group: 'Core',
            original_country: 'Khmer Empire',
            population: 10,
            yields: { food: 3, production: 2 },
            religions: [{ name: 'Sun Cult', followers: 8 }],
            closest_provinces: [{ province_name: 'Outpost', distance: 2 }],
            counties: [{ terrain: 'Grassland', yields: { food: 2 } }],
          },
          {
            name: 'Outpost',
            group: 'Frontier',
            original_country: 'America',
            population: 6,
            is_conquered: true,
            yields: { gold: 4, production: 1 },
            religions: [{ name: 'Sun Cult', followers: 3 }],
            closest_provinces: [{ province_name: 'Capital', distance: 2 }],
            counties: [{ terrain: 'Coast', yields: { gold: 2 } }],
          },
        ],
      },
      { silent: true }
    )
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Regional Decision Desk')
    expect(wrapper.text()).toContain('Core')
    expect(wrapper.text()).toContain('Frontier')

    await wrapper.get('.visualization-select select').setValue('regional-risk')
    expect(wrapper.text()).toContain('Regional Risk Board')
  })
})
