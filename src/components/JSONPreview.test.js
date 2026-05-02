import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import JSONPreview from './JSONPreview.vue'
import { useFormStore } from '../stores/formStore'

describe('JSONPreview', () => {
  it('renders the export JSON shape with calculated fields', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useFormStore()
    store.loadTemplate(
      {
        country: { basic_info: { name: 'Test Civ', leader: '' } },
        province_groups: ['Core'],
        global_religions: ['Sun Cult'],
        provinces: [
          {
            name: 'Capital',
            group: 'Core',
            population: 10,
            religions: [{ name: 'Sun Cult', followers: 8 }],
            counties: [],
          },
        ],
      },
      { silent: true }
    )

    const wrapper = mount(JSONPreview, { global: { plugins: [pinia] } })
    const preview = JSON.parse(wrapper.get('#json-preview').element.value)

    expect(preview.provinces[0]).toMatchObject({
      assemblypeople: 10,
      prelates: expect.any(Number),
      dominant_religion: 'Sun Cult',
    })
    expect(preview.provinces[0].provincial_population).toEqual(expect.any(Number))
    expect(preview.province_groups[0]).toMatchObject({
      name: 'Core',
      regional_population: expect.any(Number),
      assemblypeople: 10,
      prelates: expect.any(Number),
    })
  })
})
