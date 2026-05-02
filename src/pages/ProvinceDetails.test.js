import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ProvinceDetails from './ProvinceDetails.vue'
import { useFormStore } from '../stores/formStore'

function mountPage() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(ProvinceDetails, {
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

describe('ProvinceDetails', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders an empty state without province data', () => {
    const { wrapper } = mountPage()

    expect(wrapper.text()).toContain('No Province Data')
  })

  it('renders a selectable visualization for loaded provinces', async () => {
    const { wrapper, store } = mountPage()
    store.loadTemplate(
      {
        country: { basic_info: { name: 'Test', leader: '' } },
        province_groups: ['Core'],
        global_religions: ['Sun Cult'],
        provinces: [
          {
            name: 'Capital',
            group: 'Core',
            population: 10,
            yields: { food: 3, production: 2 },
            religions: [{ name: 'Sun Cult', followers: 8 }],
            counties: [{ terrain: 'Grassland', yields: { food: 2 } }],
          },
        ],
      },
      { silent: true }
    )
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Calculated Population')
    expect(wrapper.text()).toContain('Capital')

    await wrapper.get('.visualization-select select').setValue('terrain-mix')
    expect(wrapper.text()).toContain('Terrain Mix')

    await wrapper.get('.province-toggle input').setValue(false)
    expect(wrapper.text()).toContain('Selected')
  })
})
