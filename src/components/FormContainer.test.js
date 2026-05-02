import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import FormContainer from './FormContainer.vue'
import { useFormStore } from '../stores/formStore'

function mountContainer(options = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(FormContainer, {
    props: options.props,
    global: {
      plugins: [pinia],
      stubs: {
        ArraySection: { template: '<div data-test="array-section" />' },
        FieldsetGroup: { template: '<div data-test="fieldset-group" />' },
        JSONPreview: { template: '<div data-test="json-preview" />' },
        ProvinceDetails: { template: '<div data-test="province-details">Province Details</div>' },
        ReferenceDataSection: { template: '<div data-test="reference-section" />' },
        RegionalDetails: { template: '<div data-test="regional-details">Regional Details</div>' },
      },
    },
  })
  return { wrapper, store: useFormStore() }
}

describe('FormContainer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders an empty state before data is loaded', () => {
    const { wrapper } = mountContainer()

    expect(wrapper.text()).toContain('No Template Loaded')
  })

  it('shows builder sections and switches between them', async () => {
    const { wrapper, store } = mountContainer()
    store.loadTemplate(
      {
        country: { basic_info: { name: 'Khmer Empire', leader: '' } },
        province_groups: ['Core'],
        global_religions: ['Sun Cult'],
        provinces: [{ name: 'Capital', group: 'Core', is_national_capital: true, population: 5, counties: [] }],
      },
      { silent: true }
    )
    await nextTick()

    expect(wrapper.text()).toContain('Khmer Empire')
    expect(wrapper.text()).toContain('Country Overview')
    expect(wrapper.text()).toContain('Regional Details')
    expect(wrapper.text()).toContain('Province Details')
    expect(wrapper.text()).toContain('Country Data')
    expect(wrapper.text()).toContain('Provinces Data')

    await wrapper.findAll('.builder-tab').find((button) => button.text().includes('Regional Details')).trigger('click')
    expect(wrapper.find('[data-test="regional-details"]').exists()).toBe(true)

    await wrapper.findAll('.builder-tab').find((button) => button.text().includes('Province Details')).trigger('click')
    expect(wrapper.find('[data-test="province-details"]').exists()).toBe(true)

    await wrapper.findAll('.builder-tab').find((button) => button.text().includes('Reference Data')).trigger('click')
    expect(wrapper.find('[data-test="reference-section"]').exists()).toBe(true)

    await wrapper.findAll('.builder-tab').find((button) => button.text().includes('JSON Preview')).trigger('click')
    expect(wrapper.find('[data-test="json-preview"]').exists()).toBe(true)
  })

  it('can open directly to the Province Details tab', async () => {
    const { wrapper, store } = mountContainer({ props: { initialSection: 'province-details' } })
    store.loadTemplate(
      {
        country: { basic_info: { name: 'Khmer Empire', leader: '' } },
        province_groups: ['Core'],
        global_religions: [],
        provinces: [{ name: 'Capital', group: 'Core', population: 5, counties: [] }],
      },
      { silent: true }
    )
    await nextTick()

    expect(wrapper.find('[data-test="province-details"]').exists()).toBe(true)
  })

  it('keeps old regional overview links opening the Regional Details tab', async () => {
    const { wrapper, store } = mountContainer({ props: { initialSection: 'regional-overview' } })
    store.loadTemplate(
      {
        country: { basic_info: { name: 'Khmer Empire', leader: '' } },
        province_groups: ['Core'],
        global_religions: [],
        provinces: [{ name: 'Capital', group: 'Core', population: 5, counties: [] }],
      },
      { silent: true }
    )
    await nextTick()

    expect(wrapper.find('[data-test="regional-details"]').exists()).toBe(true)
  })
})
