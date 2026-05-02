import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import AppNav from './AppNav.vue'

describe('AppNav', () => {
  it('shows the two primary workspace destinations', () => {
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

    expect(labels).toEqual(['Data Input and Overview', 'Election Simulator'])
  })

  it('marks every election child route as part of the simulator', () => {
    const wrapper = mount(AppNav, {
      global: {
        plugins: [createPinia()],
        mocks: { $route: { path: '/elections/regional' } },
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a class="app-nav-link"><slot /></a>',
          },
        },
      },
    })

    const activeLabels = wrapper.findAll('.app-nav-link--active').map((link) => link.text())

    expect(activeLabels).toEqual(['Election Simulator'])
  })
})
