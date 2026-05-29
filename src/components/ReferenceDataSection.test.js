import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ReferenceDataSection from './ReferenceDataSection.vue'
import { useFormStore } from '../stores/formStore'

function loadReferenceData() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useFormStore()
  store.loadTemplate(
    {
      country: {
        basic_info: { name: 'Test', leader: '' },
        state_religion: 'Sun Cult',
      },
      province_groups: ['Core'],
      global_religions: ['Sun Cult'],
      provinces: [
        { name: 'Capital', group: 'Core', religions: [{ name: 'Sun Cult', followers: 4 }], counties: [] },
        { name: 'Frontier', group: null, religions: [{ name: 'Moon Cult', followers: 2 }], counties: [] },
      ],
    },
    { silent: true }
  )
  return { pinia, store }
}

describe('ReferenceDataSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('edits shared groups and shows reference warnings', async () => {
    const { pinia, store } = loadReferenceData()
    const wrapper = mount(ReferenceDataSection, { global: { plugins: [pinia] } })

    expect(wrapper.text()).toContain('Province Assignments')
    expect(wrapper.text()).toContain('1 province is unassigned')
    expect(wrapper.text()).toContain('Referenced but not global: Moon Cult')

    const groupSelects = wrapper.findAll('.assignment-row select')
    await groupSelects[1].setValue('Core')
    expect(store.currentData.provinces[1].group).toBe('Core')

    const addInput = wrapper.find('form.inline-add input')
    await addInput.setValue('Islands')
    await wrapper.find('form.inline-add').trigger('submit')
    expect(store.currentData.province_groups).toContain('Islands')
  })

  it('removes groups through store-backed actions', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { pinia, store } = loadReferenceData()
    const wrapper = mount(ReferenceDataSection, { global: { plugins: [pinia] } })

    await wrapper.get('.icon-danger').trigger('click')
    expect(store.currentData.province_groups).toEqual([])
    expect(store.currentData.provinces[0].group).toBeNull()
  })

  it('edits election party names, abbreviations, and palette colors as reference data', async () => {
    const { pinia, store } = loadReferenceData()
    const wrapper = mount(ReferenceDataSection, { global: { plugins: [pinia] } })
    const yellowRow = wrapper.findAll('.party-reference-row')[0]

    await yellowRow.get('input[aria-label="yellow party name"]').setValue('Imperial Agrarians')
    await yellowRow.get('input[aria-label="yellow abbreviated party name"]').setValue('IA')
    await yellowRow.get('button[aria-label="Teal Party"]').trigger('click')

    expect(store.currentData.config.parties.find((p) => p.id === 'yellow')).toMatchObject({
      name: 'Imperial Agrarians',
      abbreviation: 'IA',
      colorName: 'Teal',
      color: '#2dd4bf',
    })
    expect(store.partyMeta.yellow.name).toBe('Imperial Agrarians')
    expect(store.partyMeta.yellow.abbreviation).toBe('IA')
    expect(store.partyMeta.yellow.colorName).toBe('Teal')
    expect(store.partyMeta.yellow.colorLabel).toBe('Teal Party')
    expect(store.partyMeta.yellow.color).toBe('#2dd4bf')
    expect(wrapper.text()).toContain('Teal Party')
  })
})
