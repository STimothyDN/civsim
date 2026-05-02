import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import AppNav from './AppNav.vue'

describe('AppNav', () => {
  it('places Province Details between Home and elections links', () => {
    const wrapper = mount(AppNav, {
      global: {
        plugins: [createPinia()],
        mocks: { $route: { path: '/' } },
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>',
          },
        },
      },
    })

    const labels = wrapper.findAll('.app-nav-link').map((link) => link.text())

    expect(labels.slice(0, 4)).toEqual(['Home', 'Province Details', 'Election Overview', 'National Elections'])
  })
})
