import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import FormContainer from './FormContainer.vue'
import { useFormStore } from '../stores/formStore'

function mountContainer() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(FormContainer, {
    global: {
      plugins: [pinia],
      stubs: {
        ArraySection: { template: '<div data-test="array-section" />' },
        FieldsetGroup: { template: '<div data-test="fieldset-group" />' },
        JSONPreview: { template: '<div data-test="json-preview" />' },
        ReferenceDataSection: { template: '<div data-test="reference-section" />' },
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
    expect(wrapper.text()).toContain('Regional Overview')
    expect(wrapper.text()).toContain('Provincial Overview')
    expect(wrapper.text()).toContain('Country Data')
    expect(wrapper.text()).toContain('Provinces Data')

    await wrapper.findAll('.builder-tab').find((button) => button.text().includes('Regional Overview')).trigger('click')
    expect(wrapper.text()).toContain('Core')
    expect(wrapper.text()).toContain('Regional Pop')

    await wrapper.findAll('.builder-tab').find((button) => button.text().includes('Reference Data')).trigger('click')
    expect(wrapper.find('[data-test="reference-section"]').exists()).toBe(true)

    await wrapper.findAll('.builder-tab').find((button) => button.text().includes('JSON Preview')).trigger('click')
    expect(wrapper.find('[data-test="json-preview"]').exists()).toBe(true)
  })

  it('defaults regional and provincial overview order to reference and sidebar order', async () => {
    const { wrapper, store } = mountContainer()
    store.loadTemplate(
      {
        country: { basic_info: { name: 'Khmer Empire', leader: '' } },
        province_groups: ['Beta Region', 'Alpha Region'],
        global_religions: [],
        provinces: [
          { name: 'Alpha Low', group: 'Alpha Region', population: 10, counties: [] },
          { name: 'Beta Low', group: 'Beta Region', population: 20, counties: [] },
          { name: 'Beta High', group: 'Beta Region', population: 40, counties: [] },
          { name: 'Alpha High', group: 'Alpha Region', population: 30, counties: [] },
          { name: 'No Group', group: null, population: 50, counties: [] },
        ],
      },
      { silent: true }
    )
    await nextTick()

    await wrapper.findAll('.builder-tab').find((button) => button.text().includes('Regional Overview')).trigger('click')
    let cardTitles = wrapper.findAll('.province-overview-card-header h3').map((node) => node.text())
    expect(cardTitles).toEqual(['Beta Region', 'Alpha Region', 'Unassigned'])

    await wrapper.findAll('.builder-tab').find((button) => button.text().includes('Provincial Overview')).trigger('click')
    cardTitles = wrapper.findAll('.province-overview-card-header h3').map((node) => node.text())
    expect(cardTitles).toEqual(['Beta High', 'Beta Low', 'Alpha High', 'Alpha Low', 'No Group'])
  })
})
