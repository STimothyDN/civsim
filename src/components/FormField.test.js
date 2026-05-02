import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FormField from './FormField.vue'
import { useFormStore } from '../stores/formStore'

describe('FormField', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders province group fields as shared reference selects', async () => {
    const store = useFormStore()
    store.loadTemplate(
      {
        country: { basic_info: { name: 'Test', leader: '' } },
        province_groups: ['Core', 'Frontier'],
        global_religions: [],
        provinces: [{ name: 'Capital', group: 'Core', counties: [] }],
      },
      { silent: true }
    )

    const wrapper = mount(FormField, {
      props: { path: 'provinces[0].group' },
    })

    const select = wrapper.get('select')
    expect(select.text()).toContain('Frontier')

    await select.setValue('Frontier')
    expect(store.currentData.provinces[0].group).toBe('Frontier')

    await select.setValue('')
    expect(store.currentData.provinces[0].group).toBeNull()
  })

  it('renders closest province name with province autocomplete and numeric distance', async () => {
    const store = useFormStore()
    store.loadTemplate(
      {
        country: { basic_info: { name: 'Test', leader: '' } },
        province_groups: [],
        global_religions: [],
        provinces: [
          { name: 'Capital', closest_provinces: [{ province_name: '', distance: null }], counties: [] },
          { name: 'Neighbor', counties: [] },
        ],
      },
      { silent: true }
    )

    const nameField = mount(FormField, {
      props: { path: 'provinces[0].closest_provinces[0].province_name' },
    })
    expect(nameField.get('input').attributes('list')).toBe('datalist-provinces-0--closest-provinces-0--province-name')
    const options = nameField.findAll('option').map((option) => option.attributes('value'))
    expect(options).toContain('Neighbor')
    expect(options).not.toContain('Capital')

    await nameField.get('input').setValue('Neighbor')
    expect(store.currentData.provinces[0].closest_provinces[0].province_name).toBe('Neighbor')

    const distanceField = mount(FormField, {
      props: { path: 'provinces[0].closest_provinces[0].distance' },
    })
    expect(distanceField.get('input').attributes('type')).toBe('number')

    await distanceField.get('input').setValue('4')
    expect(store.currentData.provinces[0].closest_provinces[0].distance).toBe(4)
  })
})
