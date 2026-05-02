import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import ArraySection from './ArraySection.vue'
import { useFormStore } from '../stores/formStore'

function mountProvinceArray() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useFormStore()
  store.loadTemplate(
    {
      country: { basic_info: { name: 'Test', leader: '' } },
      province_groups: ['North', 'South'],
      global_religions: [],
      provinces: [
        { name: 'North Low', group: 'North', population: 10, is_regional_capital: false, counties: [] },
        { name: 'South High', group: 'South', population: 20, is_regional_capital: true, counties: [] },
        { name: 'North High', group: 'North', population: 30, is_regional_capital: true, counties: [] },
        { name: 'South Low', group: 'South', population: 5, is_regional_capital: false, counties: [] },
        { name: 'Ungrouped', group: null, population: 15, is_regional_capital: true, counties: [] },
      ],
    },
    { silent: true }
  )

  const wrapper = mount(ArraySection, {
    props: { path: 'provinces', label: 'Provinces' },
    global: {
      plugins: [pinia],
      stubs: {
        FieldsetGroup: { template: '<div data-test="fieldset" />' },
        FormField: { template: '<div data-test="field" />' },
      },
    },
  })

  return { wrapper, store }
}

function sidebarGroupNames(wrapper) {
  return wrapper.findAll('.sidebar-group-label').map((label) => label.text())
}

function sidebarItemNames(group) {
  return group.findAll('.sidebar-item-name').map((item) => item.text())
}

describe('ArraySection province sidebar ordering', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  it('groups provinces by group and sorts each group by provincial population', () => {
    const { wrapper } = mountProvinceArray()
    const groups = wrapper.findAll('.sidebar-group')

    expect(sidebarGroupNames(wrapper)).toEqual(['North', 'South', 'Unassigned'])
    expect(sidebarItemNames(groups[0])).toEqual(['Province: North High', 'Province: North Low'])
    expect(sidebarItemNames(groups[1])).toEqual(['Province: South High', 'Province: South Low'])
    expect(sidebarItemNames(groups[2])).toEqual(['Province: Ungrouped'])
  })

  it('dynamically reorders the sidebar without reordering the JSON array', async () => {
    const { wrapper, store } = mountProvinceArray()

    store.setValueAtPath('provinces[0].population', 40)
    await nextTick()

    const groups = wrapper.findAll('.sidebar-group')
    expect(sidebarItemNames(groups[0])).toEqual(['Province: North Low', 'Province: North High'])
    expect(store.currentData.provinces.map((province) => province.name)).toEqual([
      'North Low',
      'South High',
      'North High',
      'South Low',
      'Ungrouped',
    ])
  })

  it('collapses province groups in the sidebar', async () => {
    const { wrapper } = mountProvinceArray()
    const northHeader = wrapper.findAll('.sidebar-group-header')[0]

    expect(northHeader.attributes('aria-expanded')).toBe('true')
    await northHeader.trigger('click')

    expect(northHeader.attributes('aria-expanded')).toBe('false')
    expect(wrapper.findAll('.sidebar-group')[0].find('.sidebar-group-items').isVisible()).toBe(false)
  })

  it('shows regional capital badges in every sidebar group', () => {
    const { wrapper } = mountProvinceArray()
    const groups = wrapper.findAll('.sidebar-group')

    expect(wrapper.findAll('.sidebar-group-capital')).toHaveLength(3)
    expect(groups[0].text()).toContain('⭐')
    expect(groups[1].text()).toContain('⭐')
    expect(groups[2].text()).toContain('⭐')
  })

  it('selects and focuses the first field when adding a county', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useFormStore()
    store.loadTemplate(
      {
        country: { basic_info: { name: 'Test', leader: '' } },
        province_groups: [],
        global_religions: [],
        provinces: [{ name: 'Capital', counties: [{ name: 'Old County' }] }],
      },
      { silent: true }
    )

    const host = document.createElement('div')
    document.body.appendChild(host)
    const wrapper = mount(ArraySection, {
      attachTo: host,
      props: { path: 'provinces[0].counties', label: 'Counties' },
      global: { plugins: [pinia] },
    })

    await flushPromises()
    expect(wrapper.find('.array-bottom-actions button').text()).toContain('Add County')

    await wrapper.get('.add-sidebar-btn').trigger('click')
    await flushPromises()
    await nextTick()
    for (let attempt = 0; attempt < 25 && document.activeElement?.id !== 'provinces[0].counties[1].name'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0))
      await flushPromises()
      await nextTick()
    }

    expect(store.currentData.provinces[0].counties).toHaveLength(2)
    expect(wrapper.vm.selectedIndex).toBe(1)
    expect(document.activeElement?.id).toBe('provinces[0].counties[1].name')

    wrapper.unmount()
    host.remove()
  })

  it('renders closest provinces as a fixed five-row editor', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useFormStore()
    store.loadTemplate(
      {
        country: { basic_info: { name: 'Test', leader: '' } },
        province_groups: [],
        global_religions: [],
        provinces: [
          {
            name: 'Capital',
            closest_provinces: [
              { province_name: 'Neighbor', distance: 8 },
              { province_name: 'Frontier', distance: 14 },
            ],
            counties: [],
          },
          { name: 'Neighbor', counties: [] },
          { name: 'Frontier', counties: [] },
        ],
      },
      { silent: true }
    )

    const wrapper = mount(ArraySection, {
      props: { path: 'provinces[0].closest_provinces', label: 'Closest Provinces' },
      global: { plugins: [pinia] },
    })

    await flushPromises()

    expect(wrapper.findAll('.closest-province-row')).toHaveLength(5)
    expect(wrapper.find('.array-sidebar').exists()).toBe(false)
    expect(wrapper.find('.add-sidebar-btn').exists()).toBe(false)
    expect(wrapper.find('.remove-btn').exists()).toBe(false)

    let rows = wrapper.findAll('.closest-province-row')
    expect(rows[0].get('input[type="text"]').element.value).toBe('Neighbor')
    expect(rows[1].get('input[type="text"]').element.value).toBe('Frontier')

    await rows[1].get('input[type="number"]').setValue('3')
    await nextTick()
    rows = wrapper.findAll('.closest-province-row')

    expect(rows[0].get('input[type="text"]').element.value).toBe('Frontier')
    expect(store.currentData.provinces[0].closest_provinces.map((entry) => entry.province_name).slice(0, 2)).toEqual([
      'Frontier',
      'Neighbor',
    ])
  })
})
