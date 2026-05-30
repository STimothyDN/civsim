import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import AppNav from './AppNav.vue'

function mountRail(path) {
  return mount(AppNav, {
    global: {
      plugins: [createPinia()],
      mocks: { $route: { path } },
      stubs: {
        RouterLink: {
          props: ['to'],
          template: '<a><slot /></a>',
        },
      },
    },
  })
}

describe('AppNav', () => {
  it('shows the four primary workspace destinations', () => {
    const wrapper = mountRail('/')

    const labels = wrapper.findAll('a.nav-item').map((link) => link.text())

    expect(labels).toEqual(['Command', 'Country Overview', 'Builder', 'Election Simulator'])
  })

  it('marks every election child route as part of the simulator', () => {
    const wrapper = mountRail('/elections/regional')

    const activeLabels = wrapper.findAll('a.nav-item--active').map((link) => link.text())

    expect(activeLabels).toEqual(['Election Simulator'])
  })
})
